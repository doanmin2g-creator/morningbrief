const fetchAndPrint = async (url) => {
  try {
    console.log(`Fetching: ${url}`);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`SUCCESS. Array length:`, Array.isArray(data?.Data) ? data.Data.length : (Array.isArray(data) ? data.length : "Not array"));
      if (data?.Data && data.Data.length > 0) {
        console.log(`Sample symbol:`, data.Data[0].Symbol);
      }
    } else {
      console.log(`FAILED. Status: ${res.status}`);
    }
  } catch (err) {
    console.log(`ERROR:`, err.message);
  }
};

const run = async () => {
  await fetchAndPrint(`https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=HOSE&type=UP`);
  await fetchAndPrint(`https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=1&type=UP`);
};

run();
