import { NextRequest, NextResponse } from "next/server";

const FEEDS: Record<string, string> = {
  general: "https://cafef.vn/vi-mo-dau-tu.rss",             // CafeF Macro & Investment
  business: "https://cafef.vn/thi-truong-chung-khoan.rss",  // CafeF Stock Market
  tech: "https://vnexpress.net/rss/so-hoa.rss"             // VnExpress Technology
};

// Memory Cache
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 3 * 60 * 1000; // Cache news for 3 minutes

function parseTimeAgo(pubDateStr: string): string {
  try {
    const pubDate = new Date(pubDateStr);
    const diffMs = Date.now() - pubDate.getTime();
    const diffMins = Math.floor(diffMs / (60 * 1000));
    
    if (diffMins < 60) {
      return `${diffMins} phút trước`;
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  } catch (e) {
    return pubDateStr;
  }
}

// Lightweight XML parser using RegExp
function parseRssXml(xmlText: string, isCafeF: boolean): any[] {
  const items: any[] = [];
  // Match all <item>...</item> tags
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1];

    // Helper to extract node value (supports CDATA)
    const extractField = (tagName: string): string => {
      const regex = new RegExp(`<${tagName}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tagName}>`);
      const fieldMatch = itemContent.match(regex);
      if (fieldMatch) {
        return (fieldMatch[1] || fieldMatch[2] || "").trim();
      }
      return "";
    };

    const title = extractField("title");
    const link = extractField("link");
    const descriptionRaw = extractField("description");
    const pubDate = extractField("pubDate");

    // Extract image URL from description HTML (e.g. <img src="IMAGE_URL" ...>)
    let image = "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200"; // Default fallback
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const imgMatch = descriptionRaw.match(imgRegex);
    if (imgMatch && imgMatch[1]) {
      image = imgMatch[1];
    }

    // Clean description text
    const cleanDesc = descriptionRaw
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/&nbsp;/g, " ")
      .trim();

    items.push({
      source: isCafeF ? "CafeF" : "VnExpress",
      title,
      description: cleanDesc,
      link,
      time: parseTimeAgo(pubDate),
      image
    });
  }

  return items;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "general";

  const feedUrl = FEEDS[category];
  if (!feedUrl) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const now = Date.now();
  const cached = cache[category];

  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cached.data, {
      headers: { "x-cache": "HIT" }
    });
  }

  try {
    const response = await fetch(feedUrl, {
      next: { revalidate: 180 }, // Cache on Next.js edge level (3m)
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    const isCafeF = feedUrl.includes("cafef.vn");
    const parsedItems = parseRssXml(xmlText, isCafeF);

    // Limit to top 8 items to keep payload lightweight
    const results = parsedItems.slice(0, 8);

    // Update Cache
    cache[category] = {
      data: results,
      timestamp: now
    };

    return NextResponse.json(results, {
      headers: { "x-cache": "MISS" }
    });
  } catch (error: any) {
    console.error("Error parsing news feed:", error);
    return NextResponse.json({ error: "Failed to load news", details: error.message }, { status: 500 });
  }
}
