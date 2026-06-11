import { NextResponse } from "next/server";
import companies from "../stock-search/companies.json";
import { VietstockConnector } from "./vietstock-connector";

// Cache structure in memory — 1 minute TTL for fresh portfolio quotes
let cachedData: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;
const RESPONSE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
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

export async function GET(request: Request) {
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const watchlistQuery = searchParams.get("watchlist") || "";

  let baseData = cachedData;
  let isHit = "HIT";
  let isFallbackResponse = false;

  if (!baseData || (now - lastCacheTime >= CACHE_TTL_MS)) {
    isHit = "MISS";
    try {
      // 1. Fetch indices and overviews concurrently
      const [
        vnIndex, hnxIndex, upcomIndex,
        hoseOverview, hnxOverview, upcomOverview,
        // Rankings
        hoseUp, hoseDown, hoseVol,
        hnxUp, hnxDown, hnxVol,
        upcomUp, upcomDown, upcomVol
      ] = await Promise.all([
        VietstockConnector.fetchIndex("VNINDEX", "VN-Index"),
        VietstockConnector.fetchIndex("HNX", "HNX-Index"),
        VietstockConnector.fetchIndex("UPCOM", "UPCoM-Index"),
        VietstockConnector.fetchIndexOverview("HOSE"),
        VietstockConnector.fetchIndexOverview("HNX"),
        VietstockConnector.fetchIndexOverview("UPCOM"),
        // Rankings
        VietstockConnector.fetchHighlights("HOSE", "UP"),
        VietstockConnector.fetchHighlights("HOSE", "DOWN"),
        VietstockConnector.fetchHighlights("HOSE", "VOLUME"),
        VietstockConnector.fetchHighlights("HNX", "UP"),
        VietstockConnector.fetchHighlights("HNX", "DOWN"),
        VietstockConnector.fetchHighlights("HNX", "VOLUME"),
        VietstockConnector.fetchHighlights("UPCOM", "UP"),
        VietstockConnector.fetchHighlights("UPCOM", "DOWN"),
        VietstockConnector.fetchHighlights("UPCOM", "VOLUME")
      ]);

      // 2. Fetch default watchlist quotes concurrently
      const defaultWatchlistQuotes = await Promise.all(
        TICKERS.map(async (t) => {
          if (t.exchange === "INDEX") {
            const indexObj = t.symbol.includes("VNINDEX") ? vnIndex : t.symbol.includes("HNX") ? hnxIndex : upcomIndex;
            return {
              symbol: t.displayName,
              ticker: t.symbol,
              price: indexObj?.price || "N/A",
              change: indexObj?.change || "0.00%",
              isPositive: indexObj?.isPositive ?? true,
              sector: t.sector,
              exchange: t.exchange,
              volume: 0,
              volumeStr: "N/A"
            };
          }

          const quote = await VietstockConnector.fetchStockQuote(t.symbol);
          // Apply reclassification overrides
          let exchange = t.exchange;
          let displayName = t.displayName;
          if (t.symbol.toUpperCase().includes("SDA")) {
            exchange = "UPCoM";
            displayName = "SDA (CTCP Simco Sông Đà)";
          }

          return {
            symbol: displayName,
            ticker: t.symbol,
            price: quote.price,
            change: quote.change,
            isPositive: quote.isPositive,
            sector: t.sector,
            exchange,
            volume: quote.volume,
            volumeStr: quote.volumeStr
          };
        })
      );

      // 3. Compile indexes list
      const indices: any[] = [];
      if (vnIndex) indices.push({ ...vnIndex, overview: hoseOverview });
      if (hnxIndex) indices.push({ ...hnxIndex, overview: hnxOverview });
      if (upcomIndex) indices.push({ ...upcomIndex, overview: upcomOverview });

      // 4. Compile highlights
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
        defaultWatchlistTickers: defaultWatchlistQuotes,
        highlights: { gainers, losers, volume }
      };

      cachedData = baseData;
      lastCacheTime = now;
    } catch (error: any) {
      console.error("Error fetching market data from VietstockConnector:", error);
      if (cachedData) {
        baseData = cachedData;
        isHit = "FALLBACK";
        isFallbackResponse = true;
      } else {
        return NextResponse.json({ error: "Failed to fetch stock data", details: error.message }, { status: 500 });
      }
    }
  }

  // 5. Load dynamic watchlist symbols
  let customTickers: any[] = [];
  const watchlistSymbols = watchlistQuery
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(s => {
      if (!s) return false;
      return !TICKERS.some(t => {
        const cleanDefaultSym = t.symbol.replace(".VN", "").replace("^", "").toUpperCase();
        const cleanDisplayName = t.displayName.split(" ")[0].toUpperCase();
        return cleanDefaultSym === s || cleanDisplayName === s;
      });
    });

  if (watchlistSymbols.length > 0) {
    try {
      customTickers = await Promise.all(
        watchlistSymbols.map(async (sym) => {
          const { symbol: cleanSym, exchange } = VietstockConnector.getCleanSymbol(sym);
          const info = companies.find((c: any) => c.symbol === cleanSym) || { name_vn: "Cổ phiếu Việt Nam", exchange };
          const displayName = `${cleanSym} - ${info.name_vn}`;
          const quote = await VietstockConnector.fetchStockQuote(cleanSym);

          return {
            symbol: displayName,
            ticker: cleanSym,
            price: quote.price,
            change: quote.change,
            isPositive: quote.isPositive,
            sector: info.name_vn,
            exchange: cleanSym === "SDA" ? "UPCoM" : exchange,
            volume: quote.volume,
            volumeStr: quote.volumeStr
          };
        })
      );
    } catch (err) {
      console.error("Error fetching dynamic watchlist symbols:", err);
    }
  }

  const combinedWatchlistTickers = [
    ...baseData.defaultWatchlistTickers,
    ...customTickers
  ];

  // 6. Enrich watchlist with order book details if active
  const activeSymbols = new Set(
    watchlistQuery
      .split(",")
      .map(s => s.trim().replace(".VN", "").replace("^", "").toUpperCase())
      .filter(Boolean)
  );

  const enrichedWatchlistTickers = await Promise.all(
    combinedWatchlistTickers.map(async (ticker) => {
      const cleanTicker = ticker.ticker.replace(".VN", "").replace("^", "").trim().toUpperCase();
      
      // Override for SDA
      let exchange = ticker.exchange;
      let symbol = ticker.symbol;
      if (cleanTicker === "SDA") {
        exchange = "UPCoM";
        symbol = "SDA - CTCP Simco Sông Đà";
      }

      if (activeSymbols.has(cleanTicker)) {
        const quote = await VietstockConnector.fetchStockQuote(cleanTicker);
        return {
          ...ticker,
          symbol,
          exchange,
          price: quote.price || ticker.price,
          change: quote.change || ticker.change,
          isPositive: quote.isPositive ?? ticker.isPositive,
          prevClose: quote.prevClose || "N/A",
          dayHigh: quote.dayHigh || "N/A",
          dayLow: quote.dayLow || "N/A",
          volume: quote.volume || ticker.volume,
          volumeStr: quote.volumeStr || ticker.volumeStr,
          buyVolume: quote.buyVolume || "N/A",
          sellVolume: quote.sellVolume || "N/A"
        };
      }

      return {
        ...ticker,
        symbol,
        exchange,
        prevClose: "N/A",
        dayHigh: "N/A",
        dayLow: "N/A",
        buyVolume: "N/A",
        sellVolume: "N/A"
      };
    })
  );

  return NextResponse.json({
    indices: baseData.indices,
    watchlistTickers: enrichedWatchlistTickers,
    highlights: baseData.highlights,
    isFallback: isFallbackResponse
  }, {
    headers: {
      ...RESPONSE_CACHE_HEADERS,
      "x-cache": isHit,
      "x-cache-age": String(Math.floor((now - lastCacheTime) / 1000)) + "s"
    }
  });
}
