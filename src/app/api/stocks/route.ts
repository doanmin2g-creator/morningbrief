import { NextResponse } from "next/server";

// Cache structure in memory to avoid hammering Entrade & CafeF APIs
let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // Cache for 30 seconds

// Major Vietnamese tickers with explicit exchanges (used for the watchlist fallback/ticker marquee)
const TICKERS = [
  { symbol: "^VNINDEX.VN", displayName: "VN-Index", sector: "Chỉ số", exchange: "INDEX" },
  { symbol: "VCB.VN", displayName: "VCB (Vietcombank)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "BID.VN", displayName: "BID (BIDV)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "CTG.VN", displayName: "CTG (VietinBank)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "TCB.VN", displayName: "TCB (Techcombank)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "MBB.VN", displayName: "MBB (MBBank)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "VPB.VN", displayName: "VPB (VPBank)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "ACB.VN", displayName: "ACB (ACBBank)", sector: "Ngân hàng", exchange: "HOSE" },
  { symbol: "VIC.VN", displayName: "VIC (Vingroup)", sector: "Bất động sản", exchange: "HOSE" },
  { symbol: "VHM.VN", displayName: "VHM (Vinhomes)", sector: "Bất động sản", exchange: "HOSE" },
  { symbol: "VRE.VN", displayName: "VRE (Vincom Retail)", sector: "Bất động sản", exchange: "HOSE" },
  { symbol: "HPG.VN", displayName: "HPG (Hoa Phat Group)", sector: "Thép", exchange: "HOSE" },
  { symbol: "GAS.VN", displayName: "GAS (PV Gas)", sector: "Dầu khí", exchange: "HOSE" },
  { symbol: "PLX.VN", displayName: "PLX (Petrolimex)", sector: "Dầu khí", exchange: "HOSE" },
  { symbol: "FPT.VN", displayName: "FPT Corp", sector: "Công nghệ", exchange: "HOSE" },
  { symbol: "MWG.VN", displayName: "MWG (Thế Giới Di Động)", sector: "Bán lẻ", exchange: "HOSE" },
  { symbol: "VNM.VN", displayName: "VNM (Vinamilk)", sector: "Tiêu dùng", exchange: "HOSE" },
  { symbol: "MSN.VN", displayName: "MSN (Masan Group)", sector: "Tiêu dùng", exchange: "HOSE" },
  { symbol: "SAB.VN", displayName: "SAB (Sabeco)", sector: "Tiêu dùng", exchange: "HOSE" },
  { symbol: "PNJ.VN", displayName: "PNJ (Vàng bạc Đá quý)", sector: "Bán lẻ", exchange: "HOSE" },
  { symbol: "VJC.VN", displayName: "VJC (Vietjet Air)", sector: "Hàng không", exchange: "HOSE" },
  { symbol: "GMD.VN", displayName: "GMD (Gemadept)", sector: "Logistics", exchange: "HOSE" },
  { symbol: "SSI.VN", displayName: "SSI Securities", sector: "Chứng khoán", exchange: "HOSE" },
  // HNX Tickers
  { symbol: "SHS.VN", displayName: "SHS (Chứng khoán SHS)", sector: "Chứng khoán", exchange: "HNX" },
  { symbol: "CEO.VN", displayName: "CEO (Tập đoàn CEO)", sector: "Bất động sản", exchange: "HNX" },
  { symbol: "PVS.VN", displayName: "PVS (Dịch vụ Dầu khí)", sector: "Dầu khí", exchange: "HNX" },
  // UPCoM Tickers
  { symbol: "BSR.VN", displayName: "BSR (Lọc dầu Bình Sơn)", sector: "Dầu khí", exchange: "UPCoM" },
  { symbol: "ACV.VN", displayName: "ACV (Cảng hàng không)", sector: "Hàng không", exchange: "UPCoM" },
  { symbol: "VEA.VN", displayName: "VEA (Máy động lực VEAM)", sector: "Công nghiệp", exchange: "UPCoM" }
];

async function fetchSymbolsChunk(chunk: typeof TICKERS) {
  const symbolsStr = chunk.map(t => encodeURIComponent(t.symbol)).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbolsStr}&range=1d&interval=1d`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 15 },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance Spark API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data?.spark?.result || [];
  } catch (error) {
    console.error("Error fetching Yahoo Finance chunks:", error);
    return [];
  }
}

async function fetchEntradeIndex(symbol: string, displayName: string) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 20 * 24 * 60 * 60; // 20 days to ensure we have enough trading days (~14 points)
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/index?from=${from}&to=${to}&symbol=${symbol}&resolution=1D`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 15 },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      }
    });
    if (!res.ok) throw new Error(`Entrade API error: HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.c && data.c.length >= 2) {
      const latestPrice = data.c[data.c.length - 1];
      const prevPrice = data.c[data.c.length - 2];
      const diff = latestPrice - prevPrice;
      const pctChange = (diff / prevPrice) * 100;
      
      const priceStr = latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const changeStr = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%";
      const isPositive = pctChange >= 0;
      
      return {
        symbol: displayName,
        ticker: symbol,
        price: priceStr,
        change: changeStr,
        isPositive,
        sector: "Chỉ số",
        exchange: "INDEX",
        history: data.c
      };
    }
  } catch (error) {
    console.error(`Error fetching Entrade index ${symbol}:`, error);
  }
  return null;
}

// Scrape Top Stock highlights from CafeF
async function fetchCafeFHighlight(exchange: string, type: "UP" | "DOWN" | "VOLUME"): Promise<any[]> {
  const url = `https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=${exchange}&type=${type}`;
  try {
    const response = await fetch(url, {
      next: { revalidate: 30 },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const list = data?.Data || [];
    
    return list.map((item: any) => {
      const pctChange = item.ChangePricePercent || 0;
      const changeStr = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%";
      return {
        symbol: item.Symbol,
        ticker: item.Symbol,
        price: item.CurrentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        change: changeStr,
        isPositive: pctChange >= 0,
        pctChange: pctChange,
        volume: item.Volume || 0,
        volumeStr: (item.Volume || 0).toLocaleString("en-US"),
        sector: item.CompanyName || "Cổ phiếu Việt Nam",
        exchange: exchange === "UPCOM" ? "UPCoM" : exchange
      };
    });
  } catch (err) {
    console.error(`Error scraping CafeF Top Stocks (${exchange} - ${type}):`, err);
    return [];
  }
}

export async function GET() {
  const now = Date.now();
  
  // Return cached data if valid
  if (cachedData && (now - lastCacheTime < CACHE_TTL_MS)) {
    return NextResponse.json(cachedData, {
      headers: { "x-cache": "HIT" }
    });
  }

  try {
    // 1. Fetch Entrade indices and Yahoo watchlist chunks concurrently
    const chunk1 = TICKERS.slice(0, 15);
    const chunk2 = TICKERS.slice(15);

    const [
      result1, 
      result2, 
      vnIndexEntrade, 
      hnxIndex, 
      upcomIndex,
      // CafeF highlights (3 exchanges x 3 categories)
      hoseUp, hoseDown, hoseVol,
      hnxUp, hnxDown, hnxVol,
      upcomUp, upcomDown, upcomVol
    ] = await Promise.all([
      fetchSymbolsChunk(chunk1),
      fetchSymbolsChunk(chunk2),
      fetchEntradeIndex("VNINDEX", "VN-Index"),
      fetchEntradeIndex("HNX", "HNX-Index"),
      fetchEntradeIndex("UPCOM", "UPCoM-Index"),
      // Scrape CafeF gainers, losers, active stocks
      fetchCafeFHighlight("HOSE", "UP"),
      fetchCafeFHighlight("HOSE", "DOWN"),
      fetchCafeFHighlight("HOSE", "VOLUME"),
      fetchCafeFHighlight("HNX", "UP"),
      fetchCafeFHighlight("HNX", "DOWN"),
      fetchCafeFHighlight("HNX", "VOLUME"),
      fetchCafeFHighlight("UPCOM", "UP"),
      fetchCafeFHighlight("UPCOM", "DOWN"),
      fetchCafeFHighlight("UPCOM", "VOLUME")
    ]);

    const resultList = [...(result1 || []), ...(result2 || [])];

    // 2. Map standard Watchlist/Banner tickers
    const watchlistTickers = TICKERS.map(t => {
      const tickerResult = resultList.find((r: any) => r.symbol === t.symbol);
      const meta = tickerResult?.response?.[0]?.meta;

      let price = "N/A";
      let change = "0.00%";
      let isPositive = true;

      if (meta) {
        const currentPrice = meta.regularMarketPrice;
        const prevClose = meta.previousClose || meta.chartPreviousClose;

        if (currentPrice !== undefined && prevClose !== undefined) {
          const diff = currentPrice - prevClose;
          const pctChange = (diff / prevClose) * 100;
          const isIndex = t.symbol.startsWith("^");

          price = isIndex
            ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : (currentPrice / 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          change = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%";
          isPositive = pctChange >= 0;
        }
      }

      return {
        symbol: t.displayName,
        ticker: t.symbol,
        price,
        change,
        isPositive,
        sector: t.sector,
        exchange: t.exchange
      };
    });

    // Merge Entrade index history if available
    const indices: any[] = [];
    if (vnIndexEntrade) indices.push(vnIndexEntrade);
    if (hnxIndex) indices.push(hnxIndex);
    if (upcomIndex) indices.push(upcomIndex);

    // 3. Process CafeF highlights
    const gainers = [...hoseUp, ...hnxUp, ...upcomUp]
      .sort((a, b) => b.pctChange - a.pctChange)
      .slice(0, 10);

    const losers = [...hoseDown, ...hnxDown, ...upcomDown]
      .sort((a, b) => a.pctChange - b.pctChange)
      .slice(0, 10);

    const volume = [...hoseVol, ...hnxVol, ...upcomVol]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    const parsedData = {
      indices,
      watchlistTickers,
      highlights: {
        gainers,
        losers,
        volume
      }
    };

    cachedData = parsedData;
    lastCacheTime = now;

    return NextResponse.json(parsedData, {
      headers: { "x-cache": "MISS" }
    });
  } catch (error: any) {
    console.error("Error compiling stock data:", error);
    
    // Return cached data as fallback if available, otherwise return error
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { "x-cache": "FALLBACK" }
      });
    }
    return NextResponse.json({ error: "Failed to fetch stock data", details: error.message }, { status: 500 });
  }
}
