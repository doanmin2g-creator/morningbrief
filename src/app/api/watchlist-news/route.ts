import { NextResponse } from "next/server";

const CAFEF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://cafef.vn/",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "X-Requested-With": "XMLHttpRequest",
  "Connection": "keep-alive"
};

interface NewsItem {
  title: string;
  link: string;
  time: string;
  timestamp: number;
  relatedSymbol: string; // The symbol that this news belongs to (e.g. FPT, FRT)
}

// In-memory cache for news per symbol (5 minutes TTL)
const newsCache = new Map<string, { data: NewsItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Ecosystem/Sector Mapping
const ECOSYSTEM_MAP: Record<string, string[]> = {
  // Vingroup
  "VIC": ["VIC", "VHM", "VRE"],
  "VHM": ["VIC", "VHM", "VRE"],
  "VRE": ["VIC", "VHM", "VRE"],
  // FPT
  "FPT": ["FPT", "FRT", "FTS", "FOX"],
  "FRT": ["FPT", "FRT", "FTS", "FOX"],
  "FTS": ["FPT", "FRT", "FTS", "FOX"],
  "FOX": ["FPT", "FRT", "FTS", "FOX"],
  // Masan
  "MSN": ["MSN", "MCH", "MML", "MSR", "TCB"],
  "MCH": ["MSN", "MCH", "MML", "MSR"],
  "MML": ["MSN", "MCH", "MML", "MSR"],
  "MSR": ["MSN", "MCH", "MML", "MSR"],
  "TCB": ["TCB", "MSN"],
  // Steel
  "HPG": ["HPG", "HSG", "NKG"],
  "HSG": ["HPG", "HSG", "NKG"],
  "NKG": ["HPG", "HSG", "NKG"],
  // Retail competitors
  "MWG": ["MWG", "FRT"],
  // Gelex
  "GEX": ["GEX", "VGC", "EIB", "VIX"],
  "VGC": ["GEX", "VGC"],
  "EIB": ["EIB", "GEX", "VIX"],
  "VIX": ["VIX", "GEX", "EIB"],
  // Petroleum / Energy
  "GAS": ["GAS", "PVD", "PVS", "PVT", "BSR", "OIL"],
  "PVD": ["GAS", "PVD", "PVS", "PVT", "BSR", "OIL"],
  "PVS": ["GAS", "PVD", "PVS", "PVT", "BSR", "OIL"],
  "PVT": ["GAS", "PVD", "PVS", "PVT", "BSR", "OIL"],
  "BSR": ["GAS", "PVD", "PVS", "PVT", "BSR", "OIL"],
  "OIL": ["GAS", "PVD", "PVS", "PVT", "BSR", "OIL"],
  // Apec
  "API": ["API", "APS", "IDJ"],
  "APS": ["API", "APS", "IDJ"],
  "IDJ": ["API", "APS", "IDJ"],
  // Thành Thành Công
  "SBT": ["SBT", "GEG"],
  "GEG": ["SBT", "GEG"],
  // Securities
  "SSI": ["SSI", "VND", "HCM", "VCI", "FTS", "VIX"],
  "VND": ["SSI", "VND", "HCM", "VCI", "FTS", "VIX"],
  "HCM": ["SSI", "VND", "HCM", "VCI", "FTS", "VIX"],
  "VCI": ["SSI", "VND", "HCM", "VCI", "FTS", "VIX"]
};

// Fetch CafeF news for a single symbol
async function fetchSingleSymbolNews(symbol: string): Promise<NewsItem[]> {
  const cleanSym = symbol.trim().toUpperCase();
  
  // Check cache
  const cached = newsCache.get(cleanSym);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const url = `https://s.cafef.vn/Ajax/Events_RelatedNews_NEW.ashx?symbol=${cleanSym}&pageindex=1&pagesize=5`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: CAFEF_HEADERS
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const list = data?.Data || data?.ResultData || [];

    const news: NewsItem[] = list.map((item: any) => {
      let timeStr = item.PublishDate || item.NgayDang || item.Time || "";
      let timestamp = Date.now();

      try {
        if (timeStr) {
          const parts = timeStr.split(" ");
          const dateParts = parts[0].split("/");
          const d = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1] || "00:00:00"}`);
          timestamp = d.getTime();
          
          const now = Date.now();
          const diff = Math.floor((now - timestamp) / 60000); // minutes
          if (diff < 60) timeStr = `${diff} phút trước`;
          else if (diff < 1440) timeStr = `${Math.floor(diff / 60)} giờ trước`;
          else timeStr = `${Math.floor(diff / 1440)} ngày trước`;
        }
      } catch {
        // Fallback to current time if parsing fails
        timestamp = Date.now();
      }

      return {
        title: item.Title || item.TieuDe || "",
        link: item.Href || item.Url || item.Link || `https://cafef.vn/search/${cleanSym}`,
        time: timeStr,
        timestamp,
        relatedSymbol: cleanSym
      };
    }).filter((n: NewsItem) => n.title);

    newsCache.set(cleanSym, { data: news, timestamp: Date.now() });
    return news;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.warn(`CafeF watchlist-news timeout for ${cleanSym}`);
    } else {
      console.error(`CafeF watchlist-news error for ${cleanSym}:`, err?.message);
    }
    // Return cached data even if expired on error, if available
    return cached ? cached.data : [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsQuery = searchParams.get("symbols") || "";

  if (!symbolsQuery) {
    return NextResponse.json([]);
  }

  // Parse list of symbols
  const watchlistSymbols = symbolsQuery
    .split(",")
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  if (watchlistSymbols.length === 0) {
    return NextResponse.json([]);
  }

  // Resolve all ecosystem symbols
  const allSymbolsToFetchSet = new Set<string>();
  
  for (const sym of watchlistSymbols) {
    // Add the watchlist symbol itself
    allSymbolsToFetchSet.add(sym);
    
    // Add ecosystem symbols
    const ecosystem = ECOSYSTEM_MAP[sym];
    if (ecosystem) {
      ecosystem.forEach(e => allSymbolsToFetchSet.add(e));
    }
  }

  // Limit to max 15 symbols to avoid overwhelming the system
  const symbolsToFetch = Array.from(allSymbolsToFetchSet).slice(0, 15);

  try {
    // Fetch news concurrently for all resolved symbols
    const results = await Promise.all(
      symbolsToFetch.map(sym => fetchSingleSymbolNews(sym).catch(() => [] as NewsItem[]))
    );

    // Merge news
    const mergedNews: NewsItem[] = [];
    const seenLinks = new Set<string>();
    const seenTitles = new Set<string>();

    for (const newsList of results) {
      for (const item of newsList) {
        const uniqueKey = item.link || item.title;
        const normalizedTitle = item.title.toLowerCase().trim();
        
        if (!seenLinks.has(uniqueKey) && !seenTitles.has(normalizedTitle)) {
          seenLinks.add(uniqueKey);
          seenTitles.add(normalizedTitle);
          mergedNews.push(item);
        }
      }
    }

    // Sort by timestamp descending (most recent first)
    mergedNews.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to 12 items for mobile friendliness
    const finalNews = mergedNews.slice(0, 12);

    return NextResponse.json(finalNews);
  } catch (err: any) {
    console.error("Error generating watchlist news:", err);
    return NextResponse.json({ error: "Failed to generate watchlist news" }, { status: 500 });
  }
}
