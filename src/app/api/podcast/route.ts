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

interface FeedConfig {
  id: string;
  sourceName: string;
  artist: string;
  url: string;
  coverUrl: string;
}

// ---------------------------------------------------------------------------
// In-memory cache (5-minute TTL)
// ---------------------------------------------------------------------------

let cache: { data: PodcastEpisode[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Podcast Feeds Config
// Only from requested websites: vietcetera.com, VOV, Tuổi Trẻ, BBC
// ---------------------------------------------------------------------------

const PODCAST_FEEDS: FeedConfig[] = [
  {
    id: "vietcetera_innovators",
    sourceName: "Vietcetera",
    artist: "Vietnam Innovators",
    url: "https://anchor.fm/s/103279b48/podcast/rss",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43378946/43378946-1779971317256-8a228f724a68a.jpg"
  },
  {
    id: "vietcetera_haveasip",
    sourceName: "Vietcetera",
    artist: "Have A Sip",
    url: "https://anchor.fm/s/103273a04/podcast/rss",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43378697/43378697-1778846896466-7334cebf0838b.jpg"
  },
  {
    id: "vietcetera_coimo",
    sourceName: "Vietcetera",
    artist: "Cởi Mở",
    url: "https://anchor.fm/s/1033523bc/podcast/rss",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43387815/43387815-1757138108232-a39e496900121.jpg"
  },
  {
    id: "vov_thoisu",
    sourceName: "VOV",
    artist: "VOV Thời sự",
    url: "https://anchor.fm/s/86ec8d4/podcast/rss",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/1314781/1314781-1780991007052-1792e98464ffd.jpg"
  },
  {
    id: "tuoitre_general",
    sourceName: "Tuổi Trẻ",
    artist: "Báo Tuổi Trẻ Podcast",
    url: "https://podcast.tuoitre.vn/podcast-feed.rss",
    coverUrl: "https://cdn2.tuoitre.vn/thumb_w/1400/471584752817336320/2026/6/9/photo1780995663440-1780995663519990219478.png"
  },
  {
    id: "tuoitre_market",
    sourceName: "Tuổi Trẻ",
    artist: "Thị trường hôm nay",
    url: "https://podcast.tuoitre.vn/podcast-feed/2.rss",
    coverUrl: "https://cdn2.tuoitre.vn/thumb_w/1400/471584752817336320/2026/4/6/photo1775449879638-17754498797331350416835.jpg"
  },
  {
    id: "bbc_global",
    sourceName: "BBC",
    artist: "BBC Global News",
    url: "https://podcasts.files.bbci.co.uk/p02nq0gn.rss",
    coverUrl: "http://ichef.bbci.co.uk/images/ic/3000x3000/p0lqf7hf.jpg"
  },
  {
    id: "bbc_6min",
    sourceName: "BBC",
    artist: "BBC 6 Minute English",
    url: "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
    coverUrl: "http://ichef.bbci.co.uk/images/ic/3000x3000/p0hxqkd0.jpg"
  }
];

// ---------------------------------------------------------------------------
// Fallback data (real episodes from these sources)
// ---------------------------------------------------------------------------

const FALLBACK_EPISODES: PodcastEpisode[] = [
  {
    id: 1,
    title: "Thời sự 12h 9/6/2026: Israel chính thức tuyên bố chấm dứt xung đột với Iran",
    artist: "VOV Thời sự",
    sourceName: "VOV",
    audioUrl: "https://anchor.fm/s/86ec8d4/podcast/play/121214259/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-5-9%2F66bc9c08-234f-a854-0599-2f603493df78.mp3",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/1314781/1314781-1780991007052-1792e98464ffd.jpg",
    description: "Bản tin Thời sự 12h ngày 09/06/2026 của Đài Tiếng nói Việt Nam VOV. Cập nhật những tin tức nóng hổi trong nước và quốc tế.",
    duration: "30:00",
    pubDate: "Tue, 09 Jun 2026 07:49:21 GMT",
  },
  {
    id: 2,
    title: "Các bệnh viện hỗ trợ người chưa có thẻ bảo hiểm y tế ra sao?",
    artist: "Báo Tuổi Trẻ Podcast",
    sourceName: "Tuổi Trẻ",
    audioUrl: "https://cdn2.tuoitre.vn/471584752817336320/2026/6/9/96benhvienbhytmixdown-17809955886731986407369.mp3",
    coverUrl: "https://cdn2.tuoitre.vn/thumb_w/1400/471584752817336320/2026/6/9/photo1780995663440-1780995663519990219478.png",
    description: "Những thông tin hướng dẫn, giải đáp của các cơ quan quản lý và các bệnh viện về chính sách hỗ trợ thẻ bảo hiểm y tế cho người dân.",
    duration: "08:15",
    pubDate: "Tue, 09 Jun 2026 15:59:00 +0700",
  },
  {
    id: 3,
    title: "Kinh doanh biểu diễn: Phát triển ra sao để tạo đột phá? | Phương Nam, Co-founder Saigon Tếu | EP 115",
    artist: "Vietnam Innovators",
    sourceName: "Vietcetera",
    audioUrl: "https://anchor.fm/s/103279b48/podcast/play/120665485/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-4-28%2F425054464-44100-2-fe1e2aff32a88.m4a",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43378946/43378946-1779971317256-8a228f724a68a.jpg",
    description: "Trong số Vietnam Innovators Tiếng Việt tuần này, chúng ta sẽ trò chuyện cùng Phương Nam, Co-founder của Saigon Tếu về chủ đề kinh doanh biểu diễn nghệ thuật giải trí tại Việt Nam.",
    duration: "45:00",
    pubDate: "Thu, 28 May 2026 13:00:00 GMT",
  },
  {
    id: 4,
    title: "Donald Trump tells the BBC Israel did not defy him",
    artist: "BBC Global News",
    sourceName: "BBC",
    audioUrl: "http://open.live.bbc.co.uk/mediaselector/6/redir/version/2.0/mediaset/audio-nondrm-download-rss-low/proto/http/vpid/p0nqw8b9.mp3",
    coverUrl: "http://ichef.bbci.co.uk/images/ic/3000x3000/p0lqf7hf.jpg",
    description: "Donald Trump sits down for an interview discussing Israel, US foreign policy and geopolitical developments.",
    duration: "28:30",
    pubDate: "Tue, 09 Jun 2026 04:34:00 +0000",
  },
  {
    id: 5,
    title: "Podcaster The Tri Way: Lúc cảm thấy đã hiểu mình lại là lúc không hiểu gì - Have A Sip #256",
    artist: "Have A Sip",
    sourceName: "Vietcetera",
    audioUrl: "https://anchor.fm/s/103273a04/podcast/play/120027038/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-4-15%2F424203000-44100-2-16c7d2ed16ba3.m4a",
    coverUrl: "https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/43378697/43378697-1778846896466-7334cebf0838b.jpg",
    description: "Lắng nghe những chia sẻ sâu sắc từ Podcaster The Tri Way về hành trình tự khám phá bản thân và những bài học cuộc sống ý nghĩa.",
    duration: "58:00",
    pubDate: "Fri, 15 May 2026 13:00:00 GMT",
  }
];

// ---------------------------------------------------------------------------
// XML parsing helpers (regex-based, no external libraries)
// ---------------------------------------------------------------------------

function extractTag(xml: string, tagName: string, fallback = ""): string {
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

function extractAttribute(xml: string, tagName: string, attrName: string): string {
  const regex = new RegExp(
    `<${tagName}[^>]*?\\s${attrName}=["']([^"']+)["']`,
    "i"
  );
  const m = xml.match(regex);
  return m ? m[1].trim() : "";
}

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

function parseDate(dateStr: string): number {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  return isNaN(time) ? 0 : time;
}

// ---------------------------------------------------------------------------
// RSS fetcher & parser
// ---------------------------------------------------------------------------

function parseRssXml(xml: string, feed: FeedConfig): PodcastEpisode[] {
  const channelTitle = feed.artist || extractTag(xml, "title", feed.sourceName);
  const channelImage = feed.coverUrl ||
    extractAttribute(xml, "itunes:image", "href") ||
    extractTag(xml, "url");

  const episodes: PodcastEpisode[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = extractTag(block, "title") || "(Không có tiêu đề)";

    const artist = feed.artist ||
      extractTag(block, "itunes:author") ||
      extractTag(block, "author") ||
      feed.sourceName;

    const sourceName = feed.sourceName;

    const audioUrl =
      extractAttribute(block, "enclosure", "url") || "";

    if (!audioUrl) continue;

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
      id: 0,
      title,
      artist,
      sourceName,
      audioUrl,
      coverUrl,
      description,
      duration,
      pubDate,
    });

    if (episodes.length >= 10) break;
  }

  return episodes;
}

async function fetchAndParseFeed(feed: FeedConfig): Promise<PodcastEpisode[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }
    const xml = await res.text();
    return parseRssXml(xml, feed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Podcast feed fetch failed for ${feed.id}:`, message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "x-cache": "HIT" },
    });
  }

  try {
    const promises = PODCAST_FEEDS.map(feed => fetchAndParseFeed(feed));
    const results = await Promise.allSettled(promises);
    
    let allEpisodes: PodcastEpisode[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEpisodes = allEpisodes.concat(result.value);
      }
    }

    if (allEpisodes.length === 0) {
      throw new Error("All podcast feeds returned empty lists or failed");
    }

    // Group episodes by sourceName to prepare for round-robin interleaving
    const groups: { [key: string]: PodcastEpisode[] } = {
      "Vietcetera": [],
      "VOV": [],
      "Tuổi Trẻ": [],
      "BBC": []
    };

    for (const ep of allEpisodes) {
      if (groups[ep.sourceName]) {
        groups[ep.sourceName].push(ep);
      }
    }

    // Sort each source group by date descending (newest first)
    for (const source of Object.keys(groups)) {
      groups[source].sort((a, b) => parseDate(b.pubDate) - parseDate(a.pubDate));
    }

    // Round-robin interleaving to guarantee representation of all 4 sources
    const interleaved: PodcastEpisode[] = [];
    const maxItems = 16;
    const sources = ["Vietcetera", "VOV", "Tuổi Trẻ", "BBC"];
    
    let added = true;
    let index = 0;
    while (interleaved.length < maxItems && added) {
      added = false;
      for (const source of sources) {
        const list = groups[source];
        if (index < list.length) {
          interleaved.push(list[index]);
          added = true;
          if (interleaved.length >= maxItems) {
            break;
          }
        }
      }
      index++;
    }

    // Assign 1-indexed IDs to interleaved list
    interleaved.forEach((episode, idx) => {
      episode.id = idx + 1;
    });

    // Update cache
    cache = { data: interleaved, timestamp: now };

    return NextResponse.json(interleaved, {
      headers: { "x-cache": "MISS" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Podcast aggregation failed, using fallback:", message);

    return NextResponse.json(FALLBACK_EPISODES, {
      headers: { "x-cache": "FALLBACK" },
    });
  }
}
