async function test() {
    const url = 'https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=HOSE&type=UP';
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });
        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response starts with:", text.substring(0, 1000));
    } catch (err) {
        console.error("Error fetching:", err);
    }
}

test();
