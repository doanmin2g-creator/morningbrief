async function testAll() {
    const configs = [
        { center: 'HOSE', type: 'UP' },
        { center: 'HNX', type: 'UP' },
        { center: 'HOSE', type: 'DOWN' },
        { center: 'HOSE', type: 'VOLUME' }
    ];
    for (const config of configs) {
        const url = `https://cafef.vn/du-lieu/Ajax/Mobile/Smart/AjaxTop10CP.ashx?centerID=${config.center}&type=${config.type}`;
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            const data = await response.json();
            console.log(`\n--- ${config.center} - ${config.type} ---`);
            console.log("Count:", data.Data ? data.Data.length : 0);
            if (data.Data && data.Data.length > 0) {
                console.log("Sample:", JSON.stringify(data.Data[0]));
            }
        } catch (err) {
            console.error(`Error ${config.center}-${config.type}:`, err);
        }
    }
}

testAll();
