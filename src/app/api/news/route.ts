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
const CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;
const NEWS_FETCH_TIMEOUT_MS = 3500;
const RESPONSE_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
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

function parseTimeAgo(pubDateStr: string): string {
  const pubDate = new Date(pubDateStr);
  if (!Number.isFinite(pubDate.getTime())) return pubDateStr || "";

  const diffMins = Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / 60000));
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
    const pubDate = extractField(itemContent, "pubDate");

    if (!title || !link) continue;

    const imageMatch = descriptionRaw.match(/<img[^>]+src=["']([^"']+)["']/i);
    const image = imageMatch?.[1] ? decodeXml(imageMatch[1]) : "";

    items.push({
      source,
      title,
      description,
      link,
      time: parseTimeAgo(pubDate),
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
  const articleRegex = /<div[^>]+role=["']article["'][^>]*class=["'][^"']*tlitem[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]+role=["']article["']|<\/div>\s*<\/div>\s*<\/div>|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(htmlText)) !== null) {
    const article = match[1];
    const titleMatch = article.match(/<h3>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i);
    if (!titleMatch) continue;

    const link = normalizeCafeFLink(decodeXml(titleMatch[1]));
    const title = stripHtml(titleMatch[2]);
    if (!title || !link) continue;

    const imageMatch = article.match(/<img[^>]+src=["']([^"']+)["']/i);
    const timeMatch = article.match(/<span[^>]+class=["'][^"']*time[^"']*["'][^>]*(?:title=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/span>/i);
    const descriptionMatch = article.match(/<p[^>]+class=["'][^"']*sapo[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const pubDate = timeMatch?.[1] || stripHtml(timeMatch?.[2] || "");

    items.push({
      source,
      title,
      description: descriptionMatch ? stripHtml(descriptionMatch[1]) : "",
      link,
      time: parseTimeAgo(pubDate),
      image: imageMatch?.[1] ? decodeXml(imageMatch[1]) : "",
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
      next: { revalidate: 180 },
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
  const results = dedupeNews(
    settled
      .flatMap((result) => result.status === "fulfilled" ? result.value : [])
      .filter((item) => isAllowedSourceForCategory(category, item))
  ).slice(0, 40);

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
