import { NextRequest, NextResponse } from "next/server";

type NewsCategory = "general" | "business" | "tech";

interface FeedSource {
  url: string;
  source: string;
  format?: "rss" | "cafefHtml";
}

interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  time: string;
  timestamp: number;
  image?: string;
}

const FEEDS: Record<NewsCategory, FeedSource[]> = {
  general: [
    { url: "https://cafef.vn/vi-mo-dau-tu.chn", source: "CafeF", format: "cafefHtml" },
    { url: "https://cafef.vn/thi-truong-chung-khoan.chn", source: "CafeF", format: "cafefHtml" },
  ],
  business: [
    { url: "https://cafef.vn/thi-truong-chung-khoan.chn", source: "CafeF", format: "cafefHtml" },
    { url: "https://cafef.vn/doanh-nghiep.chn", source: "CafeF", format: "cafefHtml" },
  ],
  tech: [
    { url: "https://vnexpress.net/rss/so-hoa.rss", source: "VnExpress" },
  ],
};

const cache: Record<string, { data: NewsItem[]; timestamp: number }> = {};
const FINANCIAL_NEWS_CATEGORIES = new Set<NewsCategory>(["general", "business"]);
const SERVER_NEWS_CACHE_VERSION = "cafef-v2";
const CACHE_TTL_MS = 60 * 1000;
const STALE_TTL_MS = 5 * 60 * 1000;
const NEWS_FETCH_TIMEOUT_MS = 3500;
const RESPONSE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
};

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return decodeXml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function parseNewsDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  
  // 1. ISO 8601 local format (e.g. "2026-06-13T00:36:00") -> Assume ICT (UTC+7)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const hour = parseInt(isoMatch[4], 10);
    const minute = parseInt(isoMatch[5], 10);
    const second = parseInt(isoMatch[6], 10);
    
    const utcTime = Date.UTC(year, month, day, hour, minute, second);
    return utcTime - 7 * 60 * 60 * 1000; // Shift UTC+7 back to UTC
  }

  // 2. CafeF DD/MM/YYYY - HH:mm format -> Assume ICT (UTC+7)
  const cafeFRegex = /(?:(\d{1,2}):(\d{2}))?.*?(?:(\d{1,2})\/(\d{1,2})\/(\d{4})).*?(?:(\d{1,2}):(\d{2}))?/;
  const match = dateStr.match(cafeFRegex);
  
  if (match) {
    const day = parseInt(match[3], 10);
    const month = parseInt(match[4], 10) - 1;
    const year = parseInt(match[5], 10);
    const hour = parseInt(match[1] || match[6] || "0", 10);
    const minute = parseInt(match[2] || match[7] || "0", 10);
    
    const utcTime = Date.UTC(year, month, day, hour, minute, 0);
    return utcTime - 7 * 60 * 60 * 1000; // Shift UTC+7 back to UTC
  }

  // 3. Fallback for standard RFC 822 (e.g. "Sat, 13 Jun 2026 00:36:00 +0700") -> Parse natively
  const standardDate = new Date(dateStr);
  if (!isNaN(standardDate.getTime())) return standardDate.getTime();
  
  return Date.now();
}

function parseTimeAgo(timestamp: number): string {
  const diffMins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMins < 60) return diffMins + " phút trước";

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours + " giờ trước";

  const diffDays = Math.floor(diffHours / 24);
  return diffDays + " ngày trước";
}

function isAllowedSourceForCategory(category: NewsCategory, item: NewsItem): boolean {
  if (!FINANCIAL_NEWS_CATEGORIES.has(category)) return true;

  return item.source.trim().toLowerCase() === "cafef"
    && item.link.trim().toLowerCase().includes("cafef.vn");
}

function extractField(itemContent: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`, "i");
  const match = itemContent.match(regex);
  return match ? decodeXml(match[1]) : "";
}

function parseRssXml(xmlText: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];
    const title = stripHtml(extractField(itemContent, "title"));
    const link = stripHtml(extractField(itemContent, "link"));
    const descriptionRaw = extractField(itemContent, "description");
    const description = stripHtml(descriptionRaw);
    const pubDateStr = extractField(itemContent, "pubDate");
    const timestamp = parseNewsDate(pubDateStr);

    if (!title || !link) continue;

    const imageMatch = descriptionRaw.match(/<img[^>]+src=["']([^"']+)["']/i);
    const image = imageMatch?.[1] ? decodeXml(imageMatch[1]) : "";

    items.push({
      source,
      title,
      description,
      link,
      time: parseTimeAgo(timestamp),
      timestamp,
      image,
    });
  }

  return items;
}

function normalizeCafeFLink(link: string): string {
  if (!link) return "";
  if (link.startsWith("http")) return link;
  return `https://cafef.vn${link.startsWith("/") ? "" : "/"}${link}`;
}

function parseCafeFHtml(htmlText: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  // Split HTML by tlitem class to isolate each article block (avoiding tlitem-flex)
  const strictRegex = /class=["'](?:[^"']+\s)?tlitem(?:\s[^"']*)?["']/gi;
  const parts = htmlText.split(strictRegex);

  // Skip index 0 as it contains content before the first article block
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    
    // Stop parsing if we reach the footer to avoid scraping unrelated widgets
    if (block.includes('id="footer"') || block.includes('class="footer"')) {
      // Still parse this block, but it's usually the end of feed list
    }

    // Match title and link (check h3 structure first, then custom title classes)
    const titleMatch = block.match(/<h3>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i) ||
                       block.match(/<a[^>]+class=["'](?:[^"']+\s)?title(?:\s[^"']*)?["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) ||
                       block.match(/<a[^>]+href=["']([^"']+)["']/i);
    
    if (!titleMatch) continue;

    const rawLink = titleMatch[1];
    const link = normalizeCafeFLink(decodeXml(rawLink));
    
    // Extract title text
    let title = "";
    if (titleMatch[2]) {
      title = stripHtml(titleMatch[2]);
    } else {
      // Fallback matching for simple <a> tags
      const contentMatch = block.match(/<a[^>]+href=["'][^"']+["'][^>]*>([\s\S]*?)<\/a>/i);
      title = contentMatch ? stripHtml(contentMatch[1]) : "";
    }

    if (!title || title.length < 10) continue; // Skip minor link blocks

    // Match image URL (src or data-src lazy load attributes)
    const imageMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i) ||
                       block.match(/<img[^>]+data-src=["']([^"']+)["']/i);
    const image = imageMatch ? decodeXml(imageMatch[1]) : "";

    // Match publish time (look for class containing "time")
    const timeMatch = block.match(/<span[^>]+class=["'][^"']*time[^"']*["'][^>]*(?:title=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/span>/i) ||
                      block.match(/<span[^>]+class=["'][^"']*time[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    
    let pubDateStr = "";
    if (timeMatch) {
      pubDateStr = timeMatch[1] || stripHtml(timeMatch[2] || "");
    }
    const timestamp = parseNewsDate(pubDateStr);

    // Match Sapo / Description
    const sapoMatch = block.match(/<p[^>]+class=["'][^"']*(?:sapo|box-category-sapo)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const description = sapoMatch ? stripHtml(sapoMatch[1]) : "";

    items.push({
      source,
      title,
      description,
      link,
      time: parseTimeAgo(timestamp),
      timestamp,
      image,
    });
  }

  return items;
}

async function fetchFeed(source: FeedSource): Promise<NewsItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NEWS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      next: { revalidate: 30 },
      headers: {
        "User-Agent": source.format === "cafefHtml"
          ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          : "MorningBrief/1.0 (+https://morningbrief.local)",
        "Accept": source.format === "cafefHtml"
          ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          : "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://cafef.vn/",
      },
    });

    if (!response.ok) {
      throw new Error(`${source.source} RSS HTTP ${response.status}`);
    }

    const body = await response.text();
    return source.format === "cafefHtml"
      ? parseCafeFHtml(body, source.source)
      : parseRssXml(body, source.source);
  } finally {
    clearTimeout(timeoutId);
  }
}

function dedupeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];

  for (const item of items) {
    const key = item.link || item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category") || "general";
  const category = (categoryParam in FEEDS ? categoryParam : "general") as NewsCategory;
  const cacheKey = `${SERVER_NEWS_CACHE_VERSION}:${category}`;
  const now = Date.now();
  const cached = cache[cacheKey];

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { ...RESPONSE_CACHE_HEADERS, "x-cache": "HIT", "x-source-policy": FINANCIAL_NEWS_CATEGORIES.has(category) ? "cafef-only" : "category-default" },
    });
  }

  const settled = await Promise.allSettled(FEEDS[category].map(fetchFeed));
  let results = dedupeNews(
    settled
      .flatMap((result) => result.status === "fulfilled" ? result.value : [])
      .filter((item) => isAllowedSourceForCategory(category, item))
  );

  results.sort((a, b) => b.timestamp - a.timestamp);
  results = results.slice(0, 40);

  if (results.length > 0) {
    cache[cacheKey] = { data: results, timestamp: now };
    return NextResponse.json(results, {
      headers: { ...RESPONSE_CACHE_HEADERS, "x-cache": "MISS", "x-source-policy": FINANCIAL_NEWS_CATEGORIES.has(category) ? "cafef-only" : "category-default" },
    });
  }

  if (cached && now - cached.timestamp < STALE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { ...RESPONSE_CACHE_HEADERS, "x-cache": "STALE", "x-source-policy": FINANCIAL_NEWS_CATEGORIES.has(category) ? "cafef-only" : "category-default" },
    });
  }

  return NextResponse.json([], {
    headers: { ...RESPONSE_CACHE_HEADERS, "x-cache": "EMPTY", "x-source-policy": FINANCIAL_NEWS_CATEGORIES.has(category) ? "cafef-only" : "category-default" },
  });
}
