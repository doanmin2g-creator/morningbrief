import { NextResponse } from "next/server";

// Cache structure in memory to avoid Yahoo Finance rate limits
let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // Cache for 30 seconds

// Major Vietnamese tickers
const TICKERS = [
  { symbol: "^VNINDEX.VN", displayName: "VN-Index", sector: "Chỉ số" },
  { symbol: "VCB.VN", displayName: "VCB (Vietcombank)", sector: "Ngân hàng" },
  { symbol: "BID.VN", displayName: "BID (BIDV)", sector: "Ngân hàng" },
  { symbol: "CTG.VN", displayName: "CTG (VietinBank)", sector: "Ngân hàng" },
  { symbol: "TCB.VN", displayName: "TCB (Techcombank)", sector: "Ngân hàng" },
  { symbol: "MBB.VN", displayName: "MBB (MBBank)", sector: "Ngân hàng" },
  { symbol: "VPB.VN", displayName: "VPB (VPBank)", sector: "Ngân hàng" },
  { symbol: "ACB.VN", displayName: "ACB (ACBBank)", sector: "Ngân hàng" },
  { symbol: "VIC.VN", displayName: "VIC (Vingroup)", sector: "Bất động sản" },
  { symbol: "VHM.VN", displayName: "VHM (Vinhomes)", sector: "Bất động sản" },
  { symbol: "VRE.VN", displayName: "VRE (Vincom Retail)", sector: "Bất động sản" },
  { symbol: "HPG.VN", displayName: "HPG (Hoa Phat Group)", sector: "Thép" },
  { symbol: "GAS.VN", displayName: "GAS (PV Gas)", sector: "Dầu khí" },
  { symbol: "PLX.VN", displayName: "PLX (Petrolimex)", sector: "Dầu khí" },
  { symbol: "FPT.VN", displayName: "FPT Corp", sector: "Công nghệ" },
  { symbol: "MWG.VN", displayName: "MWG (Thế Giới Di Động)", sector: "Bán lẻ" },
  { symbol: "VNM.VN", displayName: "VNM (Vinamilk)", sector: "Tiêu dùng" },
  { symbol: "MSN.VN", displayName: "MSN (Masan Group)", sector: "Tiêu dùng" },
  { symbol: "SAB.VN", displayName: "SAB (Sabeco)", sector: "Tiêu dùng" },
  { symbol: "PNJ.VN", displayName: "PNJ (Vàng bạc Đá quý)", sector: "Bán lẻ" },
  { symbol: "VJC.VN", displayName: "VJC (Vietjet Air)", sector: "Hàng không" },
  { symbol: "GMD.VN", displayName: "GMD (Gemadept)", sector: "Logistics" },
  { symbol: "SSI.VN", displayName: "SSI Securities", sector: "Chứng khoán" }
];

async function fetchSymbolsChunk(chunk: typeof TICKERS) {
  const symbolsStr = chunk.map(t => encodeURIComponent(t.symbol)).join(",");
  const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbolsStr}&range=1d&interval=1d`;
  
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
        history: data.c
      };
    }
  } catch (error) {
    console.error(`Error fetching Entrade index ${symbol}:`, error);
  }
  return null;
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
    // Yahoo Finance has a limit of 20 symbols max per spark query.
    // We split our 23 tickers into two chunks (12 and 11) and fetch them concurrently along with Entrade indexes.
    const chunk1 = TICKERS.slice(0, 12);
    const chunk2 = TICKERS.slice(12);

    const [result1, result2, vnIndexEntrade, hnxIndex, upcomIndex] = await Promise.all([
      fetchSymbolsChunk(chunk1),
      fetchSymbolsChunk(chunk2),
      fetchEntradeIndex("VNINDEX", "VN-Index"),
      fetchEntradeIndex("HNX", "HNX-Index"),
      fetchEntradeIndex("UPCOM", "UPCoM-Index")
    ]);

    const resultList = [...result1, ...result2];

    // Map the returned batch result list back to our TICKERS array
    const parsedData = TICKERS.map(t => {
      const tickerResult = resultList.find((r: any) => r.symbol === t.symbol);
      const meta = tickerResult?.response?.[0]?.meta;

      let price = "N/A";
      let change = "0.00%";
      let isPositive = true;
      let history: number[] = [];

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

      // Merge history from Entrade for VN-Index
      if (t.symbol === "^VNINDEX.VN" && vnIndexEntrade) {
        history = vnIndexEntrade.history || [];
      }

      return {
        symbol: t.displayName,
        ticker: t.symbol,
        price,
        change,
        isPositive,
        sector: t.sector,
        ...(history.length > 0 ? { history } : {})
      };
    });

    // Append extra indexes
    if (hnxIndex) {
      parsedData.push(hnxIndex);
    }
    if (upcomIndex) {
      parsedData.push(upcomIndex);
    }

    cachedData = parsedData;
    lastCacheTime = now;

    return NextResponse.json(parsedData, {
      headers: { "x-cache": "MISS" }
    });
  } catch (error: any) {
    console.error("Error fetching chunked stock data:", error);
    
    // Return cached data as fallback if available, otherwise return error
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: { "x-cache": "FALLBACK" }
      });
    }
    return NextResponse.json({ error: "Failed to fetch stock data", details: error.message }, { status: 500 });
  }
}
