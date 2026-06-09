const FEEDS = {
  vietcetera_innovators_vn: "https://anchor.fm/s/103279b48/podcast/rss",
  vietcetera_haveasip: "https://anchor.fm/s/103273a04/podcast/rss",
  vietcetera_coimo: "https://anchor.fm/s/1033523bc/podcast/rss",
  vov_thoisu: "https://anchor.fm/s/86ec8d4/podcast/rss",
  tuoitre_general: "https://podcast.tuoitre.vn/podcast-feed.rss",
  tuoitre_market: "https://podcast.tuoitre.vn/podcast-feed/2.rss",
  bbc_global: "https://podcasts.files.bbci.co.uk/p02nq0gn.rss",
  bbc_6min: "https://podcasts.files.bbci.co.uk/p02pc9tn.rss"
};

function extractTag(xml, tagName, fallback = "") {
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

function extractAttribute(xml, tagName, attrName) {
  const regex = new RegExp(
    `<${tagName}[^>]*?\\s${attrName}=["']([^"']+)["']`,
    "i"
  );
  const m = xml.match(regex);
  return m ? m[1].trim() : "";
}

function stripHtml(html) {
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

async function test() {
  for (const [key, url] of Object.entries(FEEDS)) {
    console.log(`\n======================================\nFetching ${key}: ${url}`);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (!res.ok) {
        console.log(`Failed with status: ${res.status}`);
        continue;
      }
      const xml = await res.text();
      console.log(`Length: ${xml.length} bytes`);
      
      const channelTitle = extractTag(xml, "title", "Unknown");
      console.log(`Channel Title: ${channelTitle}`);
      
      // Parse first item
      const match = /<item>([\s\S]*?)<\/item>/i.exec(xml);
      if (match) {
        const block = match[1];
        const title = extractTag(block, "title") || "(No title)";
        const audioUrl = extractAttribute(block, "enclosure", "url") || "";
        const coverUrl = extractAttribute(block, "itunes:image", "href") || extractTag(xml, "url") || "";
        const pubDate = extractTag(block, "pubDate") || "";
        
        console.log(`  First Item Title: ${title}`);
        console.log(`  Audio URL: ${audioUrl}`);
        console.log(`  Cover URL: ${coverUrl}`);
        console.log(`  Pub Date: ${pubDate}`);
      } else {
        console.log("  No <item> blocks found!");
      }
    } catch (err) {
      console.error(`Error fetching/parsing ${key}:`, err.message);
    }
  }
}

test();
