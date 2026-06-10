import { NextResponse } from "next/server";
import companies from "./companies.json";

interface SearchResult {
  symbol: string;
  displayName: string;
  price: string;
  change: string;
  isPositive: boolean;
  sector: string;
  exchange: string;
  prevClose: string;
  dayHigh: string;
  dayLow: string;
  volume: string;
  marketCap: string;
}

interface CompanyInfo {
  symbol: string;
  name: string;
  name_vn: string;
  exchange: string;
}

// Simple in-memory cache per symbol (30 seconds)
const searchCache = new Map<string, { data: SearchResult; timestamp: number }>();
const CACHE_TTL = 30 * 1000;

const INDEXES: CompanyInfo[] = [
  { symbol: "^VNINDEX.VN", name: "VN-Index", name_vn: "Chỉ số VN-Index", exchange: "INDEX" },
  { symbol: "HNXINDEX", name: "HNX-Index", name_vn: "Chỉ số HNX-Index", exchange: "INDEX" },
  { symbol: "UPCOM", name: "UPCoM-Index", name_vn: "Chỉ số UPCoM-Index", exchange: "INDEX" }
];

const ALL_COMPANIES = [...INDEXES, ...(companies as CompanyInfo[])];

function searchDirectory(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // First try exact symbol match (with or without index caret)
  const exactMatch = ALL_COMPANIES.find(
    (s) => s.symbol.toLowerCase() === q || s.symbol.replace("^", "").toLowerCase() === q
  );
  if (exactMatch) return [exactMatch.symbol];

  // Then fuzzy search by symbol contains + company names contains
  const results = ALL_COMPANIES.filter((s) => {
    if (s.symbol.toLowerCase().includes(q)) return true;
    if (s.name && s.name.toLowerCase().includes(q)) return true;
    if (s.name_vn && s.name_vn.toLowerCase().includes(q)) return true;
    return false;
  });

  return results.map((r) => r.symbol).slice(0, 8);
}

async function fetchEntradeQuote(entradeSymbol: string, displayName: string, exchange: string): Promise<SearchResult | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 10 * 24 * 60 * 60; // 10 days
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/index?from=${from}&to=${to}&symbol=${entradeSymbol}&resolution=1D`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.c && data.c.length >= 2) {
      const latestPrice = data.c[data.c.length - 1];
      const prevPrice = data.c[data.c.length - 2];
      const diff = latestPrice - prevPrice;
      const pctChange = (diff / prevPrice) * 100;
      
      return {
        symbol: entradeSymbol === "HNX" ? "HNXINDEX" : "UPCOM",
        displayName,
        price: latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        change: (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%",
        isPositive: pctChange >= 0,
        sector: "Chỉ số",
        exchange,
        prevClose: prevPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        dayHigh: Math.max(...data.h.slice(-2)).toLocaleString("en-US", { maximumFractionDigits: 2 }),
        dayLow: Math.min(...data.l.slice(-2)).toLocaleString("en-US", { maximumFractionDigits: 2 }),
        volume: "N/A",
        marketCap: "N/A"
      };
    }
  } catch (error) {
    console.error(`Error fetching Entrade quote for ${entradeSymbol}:`, error);
  }
  return null;
}

async function fetchEntradeStockQuote(symbol: string, displayName: string, exchange: string): Promise<SearchResult | null> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 10 * 24 * 60 * 60; // 10 days
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${from}&to=${to}&symbol=${symbol}&resolution=1D`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.c && data.c.length >= 1) {
      const latestPrice = data.c[data.c.length - 1];
      const prevPrice = data.c.length >= 2 ? data.c[data.c.length - 2] : latestPrice;
      const diff = latestPrice - prevPrice;
      const pctChange = prevPrice !== 0 ? (diff / prevPrice) * 100 : 0;
      
      const priceStr = latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const changeStr = (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%";
      const isPositive = pctChange >= 0;
      
      const lastVol = data.v && data.v.length >= 1 ? data.v[data.v.length - 1] : 0;
      const volumeStr = lastVol > 0 
        ? (lastVol / 1000).toLocaleString("en-US", { maximumFractionDigits: 0 }) + "K"
        : "N/A";
        
      const highPrice = data.h && data.h.length >= 1 ? Math.max(...data.h.slice(-2)) : latestPrice;
      const lowPrice = data.l && data.l.length >= 1 ? Math.min(...data.l.slice(-2)) : latestPrice;
      
      return {
        symbol,
        displayName,
        price: priceStr,
        change: changeStr,
        isPositive,
        sector: displayName.split(" - ")[1] || "N/A",
        exchange,
        prevClose: prevPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        dayHigh: highPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        dayLow: lowPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }),
        volume: volumeStr,
        marketCap: "N/A"
      };
    }
  } catch (error) {
    console.error(`Error fetching Entrade stock quote for ${symbol}:`, error);
  }
  return null;
}

async function fetchStockQuote(symbol: string): Promise<SearchResult | null> {
  // Check cache
  const cached = searchCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Handle Entrade indexes
  if (symbol === "HNXINDEX") {
    const quote = await fetchEntradeQuote("HNX", "HNX-Index", "INDEX");
    if (quote) {
      searchCache.set(symbol, { data: quote, timestamp: Date.now() });
      return quote;
    }
    return null;
  }
  if (symbol === "UPCOM") {
    const quote = await fetchEntradeQuote("UPCOM", "UPCoM-Index", "INDEX");
    if (quote) {
      searchCache.set(symbol, { data: quote, timestamp: Date.now() });
      return quote;
    }
    return null;
  }

  const dirEntry = ALL_COMPANIES.find(
    (s) => s.symbol === symbol
  );
  const displayName = dirEntry
    ? `${dirEntry.symbol} - ${dirEntry.name_vn}`
    : symbol;
  const exchange = dirEntry?.exchange || "HOSE";

  // Try Yahoo Finance first
  const isIndex = symbol.startsWith("^");
  const yahooSymbol = isIndex ? symbol : `${symbol}.VN`;

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(yahooSymbol)}&range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const result = data?.spark?.result?.[0];
      const meta = result?.response?.[0]?.meta;

      if (meta) {
        const currentPrice = meta.regularMarketPrice;
        const prevClose = meta.previousClose || meta.chartPreviousClose;

        if (currentPrice !== undefined && prevClose !== undefined) {
          const diff = currentPrice - prevClose;
          const pctChange = (diff / prevClose) * 100;

          const searchResult: SearchResult = {
            symbol: dirEntry?.symbol || symbol,
            displayName,
            price: isIndex
              ? currentPrice.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : (currentPrice / 1000).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
            change:
              (pctChange >= 0 ? "+" : "") + pctChange.toFixed(2) + "%",
            isPositive: pctChange >= 0,
            sector: dirEntry ? dirEntry.name_vn : "N/A",
            exchange,
            prevClose: isIndex
              ? prevClose.toLocaleString("en-US", { maximumFractionDigits: 2 })
              : (prevClose / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 }),
            dayHigh: meta.regularMarketDayHigh
              ? isIndex
                ? meta.regularMarketDayHigh.toLocaleString("en-US", { maximumFractionDigits: 2 })
                : (meta.regularMarketDayHigh / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })
              : "N/A",
            dayLow: meta.regularMarketDayLow
              ? isIndex
                ? meta.regularMarketDayLow.toLocaleString("en-US", { maximumFractionDigits: 2 })
                : (meta.regularMarketDayLow / 1000).toLocaleString("en-US", { maximumFractionDigits: 2 })
              : "N/A",
            volume: meta.regularMarketVolume
              ? (meta.regularMarketVolume / 1000).toLocaleString("en-US", {
                  maximumFractionDigits: 0,
                }) + "K"
              : "N/A",
            marketCap: meta.marketCap
              ? (meta.marketCap / 1e9).toLocaleString("en-US", {
                  maximumFractionDigits: 1,
                }) + " tỷ"
              : "N/A",
          };

          searchCache.set(symbol, { data: searchResult, timestamp: Date.now() });
          return searchResult;
        }
      }
    }
  } catch (error) {
    console.warn(`Yahoo Finance failed for ${symbol}, falling back to Entrade:`, error);
  }

  // Fallback to Entrade Stock API if Yahoo fails or returns 404
  if (!isIndex) {
    const entradeQuote = await fetchEntradeStockQuote(symbol, displayName, exchange);
    if (entradeQuote) {
      searchCache.set(symbol, { data: entradeQuote, timestamp: Date.now() });
      return entradeQuote;
    }
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  // Search directory for matching symbols
  const matchedSymbols = searchDirectory(query);

  if (matchedSymbols.length === 0) {
    // Try direct Yahoo Finance lookup with raw query as symbol
    const directResult = await fetchStockQuote(query.toUpperCase());
    if (directResult) {
      return NextResponse.json([directResult]);
    }
    return NextResponse.json([]);
  }

  // Fetch quotes for all matched symbols concurrently
  const quotes = await Promise.all(
    matchedSymbols.map((sym) => fetchStockQuote(sym))
  );

  const results = quotes.filter(
    (q): q is SearchResult => q !== null
  );

  return NextResponse.json(results);
}
