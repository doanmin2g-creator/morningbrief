import { NextResponse } from "next/server";
import companies from "./companies.json";
import { VietstockConnector } from "../stocks/vietstock-connector";

interface RelatedNews {
  title: string;
  link: string;
  time: string;
  image?: string;
  description?: string;
}

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
  pe?: string;
  pb?: string;
  eps?: string;
  marketCapVnd?: string;
  buyVolume?: string;
  sellVolume?: string;
  description?: string;
  cafefDataUrl?: string;
  dataSource?: string;
  updatedAt?: string;
  relatedNews?: RelatedNews[];
  history?: number[];
}

interface CompanyInfo {
  symbol: string;
  name: string;
  name_vn: string;
  exchange: string;
}

// In-memory cache for search results
const searchCache = new Map<string, { data: SearchResult; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

const INDEXES: CompanyInfo[] = [
  { symbol: "^VNINDEX.VN", name: "VN-Index", name_vn: "Chỉ số VN-Index", exchange: "INDEX" },
  { symbol: "HNXINDEX", name: "HNX-Index", name_vn: "Chỉ số HNX-Index", exchange: "INDEX" },
  { symbol: "UPCOM", name: "UPCoM-Index", name_vn: "Chỉ số UPCoM-Index", exchange: "INDEX" }
];

const ALL_COMPANIES = [...INDEXES, ...(companies as CompanyInfo[])];

function searchDirectory(query: string): string[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Try exact symbol match
  const exactMatch = ALL_COMPANIES.find(
    (s) => s.symbol.toLowerCase() === q || s.symbol.replace("^", "").toLowerCase() === q
  );
  if (exactMatch) return [exactMatch.symbol];

  // Fuzzy search by symbol/name
  const results = ALL_COMPANIES.filter((s) => {
    if (s.symbol.toLowerCase().includes(q)) return true;
    if (s.name && s.name.toLowerCase().includes(q)) return true;
    if (s.name_vn && s.name_vn.toLowerCase().includes(q)) return true;
    return false;
  });

  return results.map((r) => r.symbol).slice(0, 8);
}

async function fetchStockQuote(symbol: string, forceRefresh = false): Promise<SearchResult | null> {
  const { symbol: cleanSym, exchange: derivedExchange } = VietstockConnector.getCleanSymbol(symbol);
  
  const cacheKey = cleanSym;
  const cached = searchCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const isIndex = cleanSym === "VNINDEX" || cleanSym === "HNX" || cleanSym === "HNXINDEX" || cleanSym === "UPCOM";
  
  let baseResult: SearchResult;
  let exchange = cleanSym === "SDA" ? "UPCoM" : derivedExchange;

  if (isIndex) {
    const displayName = cleanSym === "VNINDEX" ? "VN-Index" : cleanSym === "HNXINDEX" || cleanSym === "HNX" ? "HNX-Index" : "UPCoM-Index";
    const indexData = await VietstockConnector.fetchIndex(cleanSym === "HNX" ? "HNXINDEX" : cleanSym, displayName);
    if (!indexData) return null;

    baseResult = {
      symbol: cleanSym === "HNX" ? "HNXINDEX" : cleanSym,
      displayName,
      price: indexData.price,
      change: indexData.change,
      isPositive: indexData.isPositive,
      sector: "Chỉ số",
      exchange: "INDEX",
      prevClose: indexData.prevClose || "N/A",
      dayHigh: indexData.dayHigh || "N/A",
      dayLow: indexData.dayLow || "N/A",
      volume: "N/A",
      marketCap: "N/A",
      history: indexData.history
    };
  } else {
    const dirEntry = ALL_COMPANIES.find(c => c.symbol.toUpperCase() === cleanSym) || (cleanSym === "SDA" ? { name_vn: "CTCP Simco Sông Đà", name: "Simco Song Da JSC" } : null);
    const displayName = dirEntry ? `${cleanSym} - ${dirEntry.name_vn}` : `${cleanSym} - Cổ phiếu Việt Nam`;
    const sector = dirEntry ? dirEntry.name_vn : "Cổ phiếu Việt Nam";

    const quote = await VietstockConnector.fetchStockQuote(cleanSym);
    const profile = await VietstockConnector.fetchStockProfile(cleanSym);
    const news = await VietstockConnector.fetchStockNews(cleanSym);
    const history = await VietstockConnector.fetchHistory(cleanSym);

    baseResult = {
      symbol: cleanSym,
      displayName,
      price: quote.price,
      change: quote.change,
      isPositive: quote.isPositive,
      sector,
      exchange,
      prevClose: quote.prevClose,
      dayHigh: quote.dayHigh,
      dayLow: quote.dayLow,
      volume: quote.volumeStr,
      marketCap: profile.marketCapVnd || "N/A",
      pe: profile.pe,
      pb: profile.pb,
      eps: profile.eps,
      marketCapVnd: profile.marketCapVnd,
      description: profile.description,
      buyVolume: quote.buyVolume,
      sellVolume: quote.sellVolume,
      relatedNews: news.length > 0 ? news : undefined,
      history: history.length > 0 ? history : undefined
    };
  }

  baseResult.cafefDataUrl = "https://cafef.vn/du-lieu.chn";
  baseResult.dataSource = "VietstockFinance Data Feed";
  baseResult.updatedAt = new Date().toISOString();

  searchCache.set(cacheKey, { data: baseResult, timestamp: Date.now() });
  return baseResult;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const forceRefresh = searchParams.get("fresh") === "1" || searchParams.has("t");

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const matchedSymbols = searchDirectory(query);

  if (matchedSymbols.length === 0) {
    const directResult = await fetchStockQuote(query.toUpperCase(), forceRefresh);
    if (directResult) {
      return NextResponse.json([directResult]);
    }
    return NextResponse.json([]);
  }

  const quotes = await Promise.all(
    matchedSymbols.map((sym) => fetchStockQuote(sym, forceRefresh))
  );

  const results = quotes.filter((q): q is SearchResult => q !== null);

  return NextResponse.json(results);
}
