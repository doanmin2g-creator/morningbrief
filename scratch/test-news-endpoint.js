const CAFEF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Referer": "https://cafef.vn/",
  "Accept": "application/json, text/javascript, */*; q=0.01",
  "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
  "X-Requested-With": "XMLHttpRequest",
  "Connection": "keep-alive"
};

async function testNews() {
  // Try NewsType=1 or NewsType=0, and with page index & page size
  const urls = [
    'https://cafef.vn/du-lieu/Ajax/PageNew/News.ashx?Symbol=FPT&PageIndex=1&PageSize=5',
    'https://cafef.vn/du-lieu/Ajax/PageNew/News.ashx?Symbol=FPT&NewsType=0&PageIndex=1&PageSize=5',
    'https://cafef.vn/du-lieu/Ajax/PageNew/News.ashx?Symbol=FPT&NewsType=1&PageIndex=1&PageSize=5',
    'https://cafef.vn/du-lieu/Ajax/PageNew/News.ashx?Symbol=FPT&NewsType=2&PageIndex=1&PageSize=5'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: CAFEF_HEADERS });
      console.log("URL:", url);
      console.log("Status:", res.status);
      const text = await res.text();
      console.log("Length:", text.length);
      if (res.status === 200 && text.length > 50) {
        console.log("SUCCESS! Sample:", text.substring(0, 500));
        try {
          const json = JSON.parse(text);
          console.log("Parsed JSON successfully! Count:", Array.isArray(json) ? json.length : Object.keys(json));
          if (Array.isArray(json) && json.length > 0) {
            console.log("First article fields:", Object.keys(json[0]));
            console.log("First article sample:", json[0]);
          } else if (json.Data && json.Data.length > 0) {
            console.log("First article in Data:", json.Data[0]);
          }
        } catch (jsonErr) {
          console.error("JSON parse error:", jsonErr.message);
        }
      }
      console.log("---------------------------------------");
    } catch (err) {
      console.error("Fetch error:", err.message);
    }
  }
}

testNews();
