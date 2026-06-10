async function testUpcom() {
    const centers = ['UPCOM', 'UP', 'UPCoM', 'UPCOM_INDEX'];
    for (const c of centers) {
        const url = `https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=${c}&type=UP`;
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            const text = await response.text();
            console.log(`Center ${c}:`, text.substring(0, 100));
        } catch (err) {
            console.error(`Error ${c}:`, err);
        }
    }
}

testUpcom();
