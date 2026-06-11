import { NextResponse } from "next/server";
import companies from "../stock-search/companies.json";

// Cache structure in memory — 5 minutes TTL
let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute for fresher portfolio quotes
const RESPONSE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
};

// CafeF browser simulation headers
const CAFEF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://cafef.vn/",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "X-Requested-With": "XMLHttpRequest",
  "Connection": "keep-alive"
};

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

interface IndexOverview {
  totalValue: number;        // Tổng GTGD (tỷ VNĐ)
  foreignBuyValue: number;   // GT mua khối ngoại (tỷ VNĐ)
  foreignSellValue: number;  // GT bán khối ngoại (tỷ VNĐ)
  foreignNetValue: number;   // GT ròng khối ngoại (tỷ VNĐ)
  advance: number;           // Số mã tăng
  decline: number;           // Số mã giảm
  noChange: number;          // Số mã không đổi
}

function formatVolume(value?: number) {
  if (!value || !Number.isFinite(value)) return "N/A";
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  }
  return value.toLocaleString("en-US");
}

async function fetchSymbolsChunk(symbols: string[]) {
  const symbolsStr = symbols.map(s => encodeURIComponent(s)).join(",");
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

// Fetch comprehensive index overview from CafeF (liquidity, breadth, foreign trading)
async function fetchCafeFIndexOverview(exchange: "HOSE" | "HNX" | "UPCOM"): Promise<IndexOverview | null> {
  // Map exchange to CafeF centerID parameter
  const centerIDMap: Record<string, string> = {
    "HOSE": "1",
    "HNX": "2", 
    "UPCOM": "9"
  };
  const centerID = centerIDMap[exchange];
  const url = `https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxMarketSummary.ashx?centerID=${centerID}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: CAFEF_HEADERS
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    
    // CafeF returns nested Data object
    const d = data?.Data || data;
    if (!d) return null;

    // Parse values — CafeF returns values in billions VND (tỷ)
    const totalValue = parseFloat(d.TotalDeal || d.TotalValue || d.GiaTriGiaoDich || 0);
    const foreignBuyValue = parseFloat(d.ForeignBuyValue || d.NNMua || 0);
    const foreignSellValue = parseFloat(d.ForeignSellValue || d.NNBan || 0);
    const foreignNetValue = foreignBuyValue - foreignSellValue;
    const advance = parseInt(d.Advance || d.Tang || d.SoMaTang || 0);
    const decline = parseInt(d.Decline || d.Giam || d.SoMaGiam || 0);
    const noChange = parseInt(d.NoChange || d.KhongDoi || d.SoMaKhongDoi || 0);

    return { totalValue, foreignBuyValue, foreignSellValue, foreignNetValue, advance, decline, noChange };
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`CafeF index overview timeout for ${exchange}`);
    } else {
      console.error(`Error fetching CafeF index overview (${exchange}):`, err);
    }
    return null;
  }
}

// Scrape Top Stock highlights from CafeF
async function fetchCafeFHighlight(exchange: string, type: "UP" | "DOWN" | "VOLUME"): Promise<any[]> {
  const url = `https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=${exchange}&type=${type}`;
  try {
    const response = await fetch(url, {
      next: { revalidate: 30 },
      headers: CAFEF_HEADERS
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

export async function GET(request: Request) {
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const watchlistQuery = searchParams.get("watchlist") || "";

  let baseData = cachedData;
  let isHit = "HIT";

  if (!baseData || (now - lastCacheTime >= CACHE_TTL_MS)) {
    isHit = "MISS";
    try {
      // 1. Fetch all default data concurrently
      const chunk1Symbols = TICKERS.slice(0, 15).map(t => t.symbol);
      const chunk2Symbols = TICKERS.slice(15).map(t => t.symbol);

      const [
        result1, 
        result2, 
        vnIndexEntrade, 
        hnxIndex, 
        upcomIndex,
        // CafeF index overviews (liquidity, breadth, foreign)
        hoseOverview, hnxOverview, upcomOverview,
        // CafeF highlights (3 exchanges x 3 categories)
        hoseUp, hoseDown, hoseVol,
        hnxUp, hnxDown, hnxVol,
        upcomUp, upcomDown, upcomVol
      ] = await Promise.all([
        fetchSymbolsChunk(chunk1Symbols),
        fetchSymbolsChunk(chunk2Symbols),
        fetchEntradeIndex("VNINDEX", "VN-Index"),
        fetchEntradeIndex("HNX", "HNX-Index"),
        fetchEntradeIndex("UPCOM", "UPCoM-Index"),
        // Index overviews from CafeF
        fetchCafeFIndexOverview("HOSE"),
        fetchCafeFIndexOverview("HNX"),
        fetchCafeFIndexOverview("UPCOM"),
        // Top stock highlights
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
      const defaultWatchlistTickers = TICKERS.map(t => {
        const tickerResult = resultList.find((r: any) => r.symbol === t.symbol);
        const meta = tickerResult?.response?.[0]?.meta;

        let price = "N/A";
        let change = "0.00%";
        let isPositive = true;
        let volume = 0;

        if (meta) {
          const currentPrice = meta.regularMarketPrice;
          const prevClose = meta.previousClose || meta.chartPreviousClose;
          volume = meta.regularMarketVolume || 0;

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
          exchange: t.exchange,
          volume,
          volumeStr: formatVolume(volume)
        };
      });

      // 3. Merge Entrade index history + CafeF index overview data
      const indices: any[] = [];
      
      if (vnIndexEntrade) {
        indices.push({
          ...vnIndexEntrade,
          overview: hoseOverview  // Attach CafeF liquidity/breadth/foreign data
        });
      }
      if (hnxIndex) {
        indices.push({
          ...hnxIndex,
          overview: hnxOverview
        });
      }
      if (upcomIndex) {
        indices.push({
          ...upcomIndex,
          overview: upcomOverview
        });
      }

      // 4. Process CafeF highlights
      const gainers = [...hoseUp, ...hnxUp, ...upcomUp]
        .sort((a, b) => b.pctChange - a.pctChange)
        .slice(0, 10);

      const losers = [...hoseDown, ...hnxDown, ...upcomDown]
        .sort((a, b) => a.pctChange - b.pctChange)
        .slice(0, 10);

      const volume = [...hoseVol, ...hnxVol, ...upcomVol]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10);

      baseData = {
        indices,
        defaultWatchlistTickers,
        highlights: {
          gainers,
          losers,
          volume
        }
      };

      cachedData = baseData;
      lastCacheTime = now;
    } catch (error: any) {
      console.error("Error compiling stock data:", error);
      
      // Use cached data as fallback if available
      if (cachedData) {
        baseData = cachedData;
        isHit = "FALLBACK";
      } else {
        return NextResponse.json({ error: "Failed to fetch stock data", details: error.message }, { status: 500 });
      }
    }
  }

  // 5. Fetch custom watchlist tickers dynamically (bypass global cache for customization)
  let customTickers: any[] = [];
  const watchlistSymbols = watchlistQuery
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(s => {
      if (!s) return false;
      // Filter out symbols already covered in TICKERS
      const inDefault = TICKERS.some(t => {
        const cleanDefaultSym = t.symbol.replace(".VN", "").replace("^", "").toUpperCase();
        const cleanDisplayName = t.displayName.split(" ")[0].toUpperCase();
        return cleanDefaultSym === s || cleanDisplayName === s;
      });
      return !inDefault;
    });

  if (watchlistSymbols.length > 0) {
    try {
      const customYahooSymbols = watchlistSymbols.map(s => s.startsWith("^") ? s : `${s}.VN`);
      const customResults = await fetchSymbolsChunk(customYahooSymbols);

      customTickers = watchlistSymbols.map(sym => {
        const yahooSym = sym.startsWith("^") ? sym : `${sym}.VN`;
        const info = (companies as any[]).find((c: any) => c.symbol === sym) || { name_vn: "Cổ phiếu Việt Nam", exchange: "HOSE" };
        const displayName = `${sym} - ${info.name_vn}`;
        const exchange = info.exchange || "HOSE";

        const tickerResult = customResults.find((r: any) => r.symbol === yahooSym);
        const meta = tickerResult?.response?.[0]?.meta;

        let price = "N/A";
        let change = "0.00%";
        let isPositive = true;
        let volume = 0;

        if (meta) {
          const currentPrice = meta.regularMarketPrice;
          const prevClose = meta.previousClose || meta.chartPreviousClose;
          volume = meta.regularMarketVolume || 0;

          if (currentPrice !== undefined && prevClose !== undefined) {
            const diff = currentPrice - prevClose;
            const pctChange = (diff / prevClose) * 100;

            price = sym.startsWith("^")
              ? currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : (currentPrice / 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            change = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%";
            isPositive = pctChange >= 0;
          }
        }

        return {
          symbol: displayName,
          ticker: sym,
          price,
          change,
          isPositive,
          sector: info.name_vn,
          exchange,
          volume,
          volumeStr: formatVolume(volume)
        };
      });
    } catch (err) {
      console.error("Error fetching custom watchlist quotes:", err);
    }
  }

  const combinedWatchlistTickers = [
    ...baseData.defaultWatchlistTickers,
    ...customTickers
  ];

  return NextResponse.json({
    indices: baseData.indices,
    watchlistTickers: combinedWatchlistTickers,
    highlights: baseData.highlights
  }, {
    headers: {
      ...RESPONSE_CACHE_HEADERS,
      "x-cache": isHit,
      "x-cache-age": String(Math.floor((now - lastCacheTime) / 1000)) + "s"
    }
  });
}
