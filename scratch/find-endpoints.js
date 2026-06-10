const CAFEF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://cafef.vn/",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "Connection": "keep-alive"
};

async function findEndpoints() {
  const url = 'https://s.cafef.vn/hose/FPT-cong-ty-co-phan-fpt.chn';
  try {
    const res = await fetch(url, { headers: CAFEF_HEADERS });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    
    // Find all occurrences of .ashx
    const ashxMatches = html.match(/[\w\-/]+\.ashx[?\w=&%-]*/g) || [];
    console.log("Unique .ashx matches found:", [...new Set(ashxMatches)]);

    // Find script contents containing Ajax or Fetch or XMLHttpRequest
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    const ajaxKeywords = ['Ajax', 'ajax', 'ashx', 'fetch', 'Events'];
    let count = 0;
    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1];
      if (ajaxKeywords.some(keyword => scriptContent.includes(keyword))) {
        console.log(`\n--- Script containing Ajax keywords #${++count} ---`);
        // Print matching lines
        const lines = scriptContent.split('\n');
        lines.forEach(line => {
          if (ajaxKeywords.some(keyword => line.includes(keyword))) {
            console.log(line.trim());
          }
        });
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

findEndpoints();
