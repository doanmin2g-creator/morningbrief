document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date in FT traditional style
    const dateEl = document.getElementById('date-text');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);

    // 2. Mock Data Services (To be replaced with real APIs)
    const marketData = [
        { symbol: 'S&P 500', price: '5,123.41', change: '+1.2%', isPositive: true },
        { symbol: 'NASDAQ', price: '16,234.12', change: '+1.5%', isPositive: true },
        { symbol: 'DOW JONES', price: '38,102.30', change: '-0.3%', isPositive: false },
        { symbol: 'FTSE 100', price: '7,950.20', change: '+0.4%', isPositive: true },
        { symbol: 'NIKKEI 225', price: '38,850.50', change: '-1.1%', isPositive: false },
        { symbol: 'AAPL', price: '$175.43', change: '+0.8%', isPositive: true },
        { symbol: 'TSLA', price: '$198.20', change: '-2.1%', isPositive: false }
    ];

    const newsData = {
        general: [
            {
                source: 'Financial Times',
                title: 'Federal Reserve Signals Potential Rate Cuts Later This Year Amid Cooling Inflation',
                time: '2 hours ago',
                image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=200'
            },
            {
                source: 'Wall Street Journal',
                title: 'Global Markets Stabilize After Week of Volatility Driven by Geopolitical Tensions',
                time: '5 hours ago',
                image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200'
            },
            {
                source: 'Reuters',
                title: 'European Central Bank Holds Rates Steady, Monitors Wage Growth Closely',
                time: '6 hours ago',
                image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=200'
            }
        ],
        business: [
            {
                source: 'Bloomberg',
                title: 'Tech Stocks Rally as AI Demand Continues to Surge Across Enterprise Sectors',
                time: '4 hours ago',
                image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200'
            },
            {
                source: 'Financial Times',
                title: 'Bond Yields Retrace as Investors Weigh Inflation Risks and Central Bank Policies',
                time: '7 hours ago',
                image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=200'
            }
        ],
        tech: [
            {
                source: 'TechCrunch',
                title: 'Next-Generation AI Models Promise Exponential Gains in Computational Efficiency',
                time: '1 hour ago',
                image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200'
            },
            {
                source: 'Wired',
                title: 'Semiconductor Manufacturers Ramp Up Domestic Production to Secure Supply Chains',
                time: '3 hours ago',
                image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=200'
            }
        ]
    };

    const cryptoData = [
        { symbol: 'BTC', name: 'Bitcoin', price: '$64,230', change: '+3.4%', isPositive: true },
        { symbol: 'ETH', name: 'Ethereum', price: '$3,450', change: '+2.1%', isPositive: true },
        { symbol: 'SOL', name: 'Solana', price: '$145.20', change: '-1.5%', isPositive: false },
        { symbol: 'BNB', name: 'Binance Coin', price: '$580.40', change: '+0.9%', isPositive: true }
    ];

    // 3. Render Functions
    
    // Tickers need to repeat so we have a seamless scrolling marquee
    const renderMarkets = () => {
        const container = document.getElementById('market-tickers');
        container.innerHTML = '';
        
        // Double the list to make seamless scrolling work perfectly
        const items = [...marketData, ...marketData];
        
        items.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'ticker-card';
            el.innerHTML = `
                <span class="ticker-symbol">${item.symbol}</span>
                <span class="ticker-price">${item.price}</span>
                <span class="ticker-change ${item.isPositive ? 'positive' : 'negative'}">${item.change}</span>
            `;
            container.appendChild(el);
        });
    };

    const renderNews = (category = 'general') => {
        const container = document.getElementById('news-feed');
        
        // Fade out animation
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        
        setTimeout(() => {
            container.innerHTML = '';
            const data = newsData[category] || [];
            
            data.forEach((item, idx) => {
                const el = document.createElement('a');
                el.href = '#';
                el.className = 'news-card';
                el.style.opacity = '0';
                el.style.transform = 'translateY(15px)';
                el.style.transition = `opacity 0.5s ease ${idx * 0.1}s, transform 0.5s ease ${idx * 0.1}s`;
                
                el.innerHTML = `
                    <div class="news-content">
                        <span class="news-source">${item.source}</span>
                        <h3 class="news-title">${item.title}</h3>
                        <span class="news-meta">${item.time}</span>
                    </div>
                    <div class="news-image-wrap">
                        <img src="${item.image}" alt="News thumbnail" class="news-image">
                    </div>
                `;
                
                container.appendChild(el);
                
                // Trigger reflow to start transition
                requestAnimationFrame(() => {
                    el.style.opacity = '1';
                    el.style.transform = 'translateY(0)';
                });
            });
            
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 300);
    };

    const renderCrypto = () => {
        const container = document.getElementById('crypto-list');
        container.innerHTML = '';
        
        cryptoData.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'crypto-item';
            el.style.opacity = '0';
            el.style.transform = 'translateX(15px)';
            el.style.transition = `opacity 0.4s ease ${idx * 0.1}s, transform 0.4s ease ${idx * 0.1}s`;
            
            el.innerHTML = `
                <div class="crypto-info">
                    <h4>${item.symbol}</h4>
                    <p>${item.name}</p>
                </div>
                <div class="crypto-price-info">
                    <h4>${item.price}</h4>
                    <span class="ticker-change ${item.isPositive ? 'positive' : 'negative'}">${item.change}</span>
                </div>
            `;
            container.appendChild(el);
            
            requestAnimationFrame(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateX(0)';
            });
        });
    };

    // 4. Tab Listeners
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const category = e.currentTarget.getAttribute('data-category');
            renderNews(category);
        });
    });

    // 5. Initialize
    renderMarkets();
    renderNews('general');
    renderCrypto();
});
