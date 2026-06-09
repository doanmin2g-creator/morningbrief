import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PodcastEpisode {
  id: number;
  title: string;
  artist: string;
  sourceName: string;
  audioUrl: string;
  coverUrl: string;
  description: string;
  duration: string;
  pubDate: string;
}

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

let cache: { data: PodcastEpisode[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// RSS feed URLs – tried in order until one succeeds
// ---------------------------------------------------------------------------

const RSS_FEED_URLS = [
  "https://vnexpress.net/rss/podcast/giai-ma.rss",
  "https://vnexpress.net/rss/podcast.rss",
];

// ---------------------------------------------------------------------------
// Hardcoded fallback data (Vietnamese financial podcasts)
// ---------------------------------------------------------------------------

const FALLBACK_EPISODES: PodcastEpisode[] = [
  {
    id: 1,
    title: "Thị trường chứng khoán tuần qua: Nhận định và triển vọng",
    artist: "VnExpress Podcast",
    sourceName: "Giải Mã Tài Chính",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    coverUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=400",
    description: "Phân tích diễn biến thị trường chứng khoán Việt Nam trong tuần qua, các yếu tố ảnh hưởng đến VN-Index và triển vọng cho tuần tới.",
    duration: "25:30",
    pubDate: "Mon, 09 Jun 2026 07:00:00 +0700",
  },
  {
    id: 2,
    title: "Lãi suất ngân hàng và tác động đến dòng tiền đầu tư",
    artist: "VnExpress Podcast",
    sourceName: "Giải Mã Tài Chính",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    coverUrl: "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?auto=format&fit=crop&q=80&w=400",
    description: "Ngân hàng Nhà nước tiếp tục giữ lãi suất ổn định. Chuyên gia phân tích tác động của chính sách tiền tệ lên thị trường vốn và bất động sản.",
    duration: "18:45",
    pubDate: "Sat, 07 Jun 2026 08:30:00 +0700",
  },
  {
    id: 3,
    title: "Kinh tế vĩ mô Việt Nam: GDP và xuất nhập khẩu quý II",
    artist: "VnExpress Podcast",
    sourceName: "Giải Mã Tài Chính",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    coverUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=400",
    description: "Tổng quan kinh tế vĩ mô Việt Nam quý II với tăng trưởng GDP khả quan, kim ngạch xuất nhập khẩu đạt kỷ lục và triển vọng lạm phát.",
    duration: "22:10",
    pubDate: "Thu, 05 Jun 2026 06:00:00 +0700",
  },
  {
    id: 4,
    title: "Đầu tư cổ phiếu ngành ngân hàng: Cơ hội hay rủi ro?",
    artist: "VnExpress Podcast",
    sourceName: "Giải Mã Tài Chính",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    coverUrl: "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&q=80&w=400",
    description: "Nhóm cổ phiếu ngân hàng chiếm tỷ trọng lớn trên sàn. Đánh giá chất lượng tài sản, nợ xấu và tiềm năng tăng trưởng lợi nhuận năm 2026.",
    duration: "30:15",
    pubDate: "Tue, 03 Jun 2026 09:00:00 +0700",
  },
];

// ---------------------------------------------------------------------------
// XML parsing helpers (regex-based, no external libraries)
// ---------------------------------------------------------------------------

/**
 * Extract the text content of an XML tag, handling CDATA sections.
 * Returns the first match found within `xml`, or `fallback`.
 */
function extractTag(xml: string, tagName: string, fallback = ""): string {
  // Handles both <tag>plain text</tag> and <tag><![CDATA[...]]></tag>
  const regex = new RegExp(
    `<${tagName}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tagName}>`,
    "i"
  );
  const m = xml.match(regex);
  if (m) {
    return (m[1] ?? m[2] ?? "").trim();
  }
  return fallback;
}

/**
 * Extract an attribute value from a self-closing or normal tag.
 * e.g. `<enclosure url="..." />` → returns the url value.
 */
function extractAttribute(xml: string, tagName: string, attrName: string): string {
  const regex = new RegExp(
    `<${tagName}[^>]*?\\s${attrName}=["']([^"']+)["']`,
    "i"
  );
  const m = xml.match(regex);
  return m ? m[1].trim() : "";
}

/** Strip all HTML tags from a string. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ---------------------------------------------------------------------------
// RSS fetcher & parser
// ---------------------------------------------------------------------------

/**
 * Try each RSS URL in order. Return the raw XML text from the first
 * URL that responds with HTTP 200.
 */
async function fetchRssXml(): Promise<string> {
  for (const url of RSS_FEED_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
        },
        // Prevent Next.js from caching this fetch indefinitely – we manage
        // our own in-memory cache with a 5-minute TTL.
        cache: "no-store",
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Silently try the next URL
    }
  }
  throw new Error("All RSS feed URLs failed");
}

/**
 * Parse raw RSS XML into an array of PodcastEpisode objects.
 */
function parseRssXml(xml: string): PodcastEpisode[] {
  // --- Channel-level defaults ---------------------------------------------------
  const channelTitle = extractTag(xml, "title", "VnExpress Podcast");
  const channelImage =
    extractAttribute(xml, "itunes:image", "href") ||
    extractTag(xml, "url"); // <image><url>...</url></image>

  // --- Parse <item> blocks -------------------------------------------------------
  const episodes: PodcastEpisode[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  let id = 1;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title") || "(Không có tiêu đề)";

    const artist =
      extractTag(block, "itunes:author") ||
      extractTag(block, "author") ||
      "VnExpress Podcast";

    const sourceName =
      extractTag(block, "itunes:subtitle") || channelTitle;

    const audioUrl =
      extractAttribute(block, "enclosure", "url") || "";

    const coverUrl =
      extractAttribute(block, "itunes:image", "href") || channelImage || "";

    const rawDescription =
      extractTag(block, "description") ||
      extractTag(block, "itunes:summary") ||
      "";
    const description = stripHtml(rawDescription);

    const duration = extractTag(block, "itunes:duration") || "";

    const pubDate = extractTag(block, "pubDate") || "";

    episodes.push({
      id: id++,
      title,
      artist,
      sourceName,
      audioUrl,
      coverUrl,
      description,
      duration,
      pubDate,
    });
  }

  return episodes;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  // 1. Return cached data if still fresh
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "x-cache": "HIT" },
    });
  }

  // 2. Fetch & parse live RSS
  try {
    const xml = await fetchRssXml();
    const episodes = parseRssXml(xml);

    if (episodes.length === 0) {
      throw new Error("RSS parsed but contained no episodes");
    }

    // Return the latest 6 episodes
    const latest = episodes.slice(0, 6);

    // Update cache
    cache = { data: latest, timestamp: now };

    return NextResponse.json(latest, {
      headers: { "x-cache": "MISS" },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Podcast RSS fetch/parse failed, using fallback:", message);

    // 3. Fallback – return hardcoded episodes so the UI always has content
    return NextResponse.json(FALLBACK_EPISODES, {
      headers: { "x-cache": "FALLBACK" },
    });
  }
}
