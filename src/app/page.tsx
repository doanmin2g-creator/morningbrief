"use client";

import { useEffect, useState } from "react";

// Types
interface TickerItem {
  symbol: string;
  ticker: string;
  price: string;
  change: string;
  isPositive: boolean;
  sector: string;
}

interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  time: string;
  image: string;
}

interface BrokerOutlook {
  name: string;
  stance: "BULLISH" | "BEARISH" | "NEUTRAL";
  targetRange: string;
  quote: string;
  class: string;
}

// Fixed/Dynamic Broker Reports Consensus (Simulating real-time inputs from local securities firms)
const initialBrokerOutlooks: BrokerOutlook[] = [
  {
    name: "SSI Research",
    stance: "BULLISH",
    targetRange: "1,245 - 1,260",
    quote: "Dòng tiền nội hấp thu tốt lực cung. Khuyến nghị giải ngân tỷ trọng cao tại nhóm Ngân hàng và Bán lẻ.",
    class: "positive"
  },
  {
    name: "MBS Securities",
    stance: "NEUTRAL",
    targetRange: "1,230 - 1,250",
    quote: "VN-Index gặp áp lực chốt lời tại vùng kháng cự mạnh. Cần nhịp tích lũy kiểm định cung cầu trước khi bứt phá.",
    class: "neutral"
  },
  {
    name: "HSC Securities",
    stance: "BEARISH",
    targetRange: "1,215 - 1,235",
    quote: "Khối ngoại liên tục bán ròng và thanh khoản sụt giảm cảnh báo rủi ro điều chỉnh kỹ thuật ngắn hạn.",
    class: "negative"
  },
  {
    name: "Vietcap Securities",
    stance: "BULLISH",
    targetRange: "1,250 - 1,270",
    quote: "Xu hướng phục hồi trung hạn được giữ vững, dẫn dắt bởi nhóm cổ phiếu Công nghệ và Bất động sản khu công nghiệp.",
    class: "positive"
  }
];

export default function Home() {
  const [dateText, setDateText] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [tickerList, setTickerList] = useState<TickerItem[]>([]);
  const [brokerOutlooks, setBrokerOutlooks] = useState<BrokerOutlook[]>(initialBrokerOutlooks);
  const [errorMsg, setErrorMsg] = useState("");

  // Format Date in traditional FT format
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    setDateText(new Date().toLocaleDateString("en-US", options));
  }, []);

  // Fetch Vietnamese Stocks (22 items)
  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      const res = await fetch("/api/stocks");
      if (!res.ok) throw new Error("Failed to fetch stock data");
      const data = await res.json();
      setTickerList(data);
    } catch (error) {
      console.error(error);
      setErrorMsg("Unable to retrieve stock data");
    } finally {
      setLoadingStocks(false);
    }
  };

  // Fetch News Feed based on selected category tab
  const fetchNews = async (category: string) => {
    setLoadingNews(true);
    try {
      const res = await fetch(`/api/news?category=${category}`);
      if (!res.ok) throw new Error("Failed to fetch news data");
      const data = await res.json();
      setNewsList(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  useEffect(() => {
    fetchNews(activeTab);
  }, [activeTab]);

  // Extract dynamically what real-time broker articles might be in the news list
  useEffect(() => {
    if (newsList.length > 0) {
      // Scan news articles for mentions of analysts or broker outlooks
      const parsedOutlooks = [...initialBrokerOutlooks];
      let updated = false;

      newsList.forEach(newsItem => {
        const title = newsItem.title;
        // SSI, MBS, HSC, VPS, SHS, VNDIRECT
        const brokerMatch = title.match(/(SSI|MBS|HSC|VPS|SHS|VNDIRECT|Vietcap|Rồng Việt)/i);
        if (brokerMatch) {
          const brokerName = brokerMatch[0].toUpperCase();
          const description = newsItem.description;

          let stance: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
          let cssClass = "neutral";
          
          if (title.match(/(tăng|tích cực|vượt|bứt phá|khả quan|khuyến nghị mua)/i)) {
            stance = "BULLISH";
            cssClass = "positive";
          } else if (title.match(/(giảm|điều chỉnh|thận trọng|rủi ro|cảnh báo)/i)) {
            stance = "BEARISH";
            cssClass = "negative";
          }

          // Check if already exist, update quote
          const idx = parsedOutlooks.findIndex(o => o.name.toUpperCase().includes(brokerName));
          if (idx !== -1) {
            parsedOutlooks[idx].stance = stance;
            parsedOutlooks[idx].quote = title;
            parsedOutlooks[idx].class = cssClass;
            updated = true;
          }
        }
      });

      if (updated) {
        setBrokerOutlooks(parsedOutlooks);
      }
    }
  }, [newsList]);

  // Dynamic Information Analyzer (22 Stocks Breadth)
  const getAnalysis = () => {
    if (loadingNews || loadingStocks || tickerList.length === 0 || newsList.length === 0) {
      return {
        sentiment: "Đang phân tích dữ liệu...",
        sentimentClass: "text-muted",
        theme: "Đang tổng hợp...",
        summary: "Hệ thống đang thu thập thông tin thị trường chứng khoán VN-30 và bài viết mới nhất từ CafeF & VnExpress để đưa ra báo cáo tổng quan hôm nay.",
        advancing: 0,
        declining: 0
      };
    }

    // 1. Calculate stock market sentiment index across 21 equities (excluding VN-Index)
    const equities = tickerList.filter(t => t.symbol !== "VN-Index");
    const advancing = equities.filter(t => t.isPositive).length;
    const declining = equities.length - advancing;
    const greenRatio = equities.length > 0 ? (advancing / equities.length) * 100 : 50;

    let sentiment = "GIẰNG CO (NEUTRAL)";
    let sentimentClass = "neutral-stance";
    if (greenRatio >= 60) {
      sentiment = `TÍCH CỰC (BULLISH) — ${advancing}/${equities.length} mã tăng điểm`;
      sentimentClass = "positive-stance";
    } else if (greenRatio <= 40) {
      sentiment = `THẬN TRỌNG (BEARISH) — ${declining}/${equities.length} mã giảm điểm`;
      sentimentClass = "negative-stance";
    } else {
      sentiment = `GIẰNG CO (NEUTRAL) — ${advancing} mã tăng / ${declining} mã giảm`;
    }

    // 2. Extract top keyword themes from news titles/descriptions
    const textCorpus = newsList.map(n => n.title.toLowerCase() + " " + n.description.toLowerCase()).join(" ");
    const keywordDefinitions = [
      { term: "Công nghệ & Chip bán dẫn", keywords: ["công nghệ", "số hóa", "ai", "trí tuệ nhân tạo", "openai", "bán dẫn", "chip"] },
      { term: "Nghị định & Chính sách Vĩ mô", keywords: ["chính phủ", "thủ tướng", "nghị định", "quyết định", "luật", "chính sách"] },
      { term: "Tiền tệ & Lãi suất ngân hàng", keywords: ["lãi suất", "ngân hàng", "tín dụng", "tỷ giá", "usd", "vcb", "bid"] },
      { term: "Xúc tiến Thương mại & FDI", keywords: ["doanh nghiệp", "đầu tư", "fdi", "xuất khẩu", "nhập khẩu", "thương mại"] },
      { term: "Giao dịch Vàng & Bất động sản", keywords: ["vàng", "bất động sản", "nhà đất", "trái phiếu", "cổ phiếu", "ipo"] }
    ];

    const keywordScores = keywordDefinitions.map(def => {
      let score = 0;
      def.keywords.forEach(kw => {
        const regex = new RegExp(kw, "gi");
        const count = (textCorpus.match(regex) || []).length;
        score += count;
      });
      return { term: def.term, score };
    });

    keywordScores.sort((a, b) => b.score - a.score);
    const topTheme = keywordScores[0].score > 0 ? keywordScores[0].term : "Thông tin Tổng hợp";

    // 3. Generate cohesive Executive Summary
    const vnIndex = tickerList.find(t => t.symbol === "VN-Index");
    const indexLine = vnIndex 
      ? `Chỉ số VN-Index hôm nay giao dịch quanh mức ${vnIndex.price} (thay đổi ${vnIndex.change}).`
      : "";
    
    const marketDirectionLine = greenRatio >= 60 
      ? `Độ rộng thị trường nghiêng hẳn về phía tăng điểm với ${advancing} mã trong rổ vốn hóa lớn giữ được sắc xanh, tạo lực đỡ vững chắc cho chỉ số chung.`
      : greenRatio <= 40
      ? `Áp lực bán chiếm ưu thế khiến ${declining} mã giảm điểm, phản ánh sự thận trọng đáng kể từ phía dòng tiền đầu tư.`
      : `Bảng điện tử ghi nhận sự cân bằng tương đối khi có ${advancing} mã tăng và ${declining} mã giảm, dòng tiền luân chuyển cục bộ phân hóa sâu sắc giữa các phân khúc ngành.`;

    const newsTrendLine = keywordScores[0].score > 0 
      ? `Tin tức vĩ mô hàng đầu phản ánh tiêu điểm về lĩnh vực ${keywordScores[0].term.toLowerCase()}.`
      : "Trang tin tức ghi nhận các biến động chuyển động đa chiều ở nhiều phân khúc kinh tế xã hội.";

    const summary = `${indexLine} ${marketDirectionLine} ${newsTrendLine} Phân tích kỹ thuật khuyên dùng các vị thế phòng thủ chủ động trong giai đoạn này.`;

    return {
      sentiment,
      sentimentClass,
      theme: topTheme,
      summary,
      advancing,
      declining
    };
  };

  const analysis = getAnalysis();

  // Seamless scrolling marquee requires duplicated list
  const duplicatedTickers = [...tickerList, ...tickerList];

  return (
    <div className="app-container">
      {/* Floating Header/Masthead */}
      <header className="masthead">
        <div className="masthead-top">
          <div className="date-badge">{dateText || "Loading date..."}</div>
          <div className="logo">
            <h1>THE MORNING BRIEF</h1>
          </div>
          <div className="user-profile">
            <div className="avatar" onClick={fetchStocks} title="Refresh Stock Data">↻</div>
          </div>
        </div>

        {/* Animated Market Ticker Banner */}
        <div className="ticker-wrap">
          <div className="ticker-label">VN MARKETS</div>
          <div className={`ticker-scroll ${loadingStocks ? "loading" : ""}`}>
            {loadingStocks ? (
              <div className="ticker-item-placeholder">Loading live markets...</div>
            ) : (
              duplicatedTickers.map((item, idx) => (
                <div key={idx} className="ticker-card">
                  <span className="ticker-symbol">{item.symbol}</span>
                  <span className="ticker-price">{item.price}</span>
                  <span className={`ticker-change ${item.isPositive ? "positive" : "negative"}`}>
                    {item.change}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="broadsheet-grid">
          
          {/* Left Column: Lead Stories (News Feed) */}
          <section className="news-section">
            <div className="column-header">
              <h2>Top Stories & Analysis</h2>
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "general" ? "active" : ""}`}
                  onClick={() => setActiveTab("general")}
                >
                  Featured
                </button>
                <button
                  className={`tab ${activeTab === "business" ? "active" : ""}`}
                  onClick={() => setActiveTab("business")}
                >
                  Kinh Doanh
                </button>
                <button
                  className={`tab ${activeTab === "tech" ? "active" : ""}`}
                  onClick={() => setActiveTab("tech")}
                >
                  Số Hóa
                </button>
              </div>
            </div>

            <div className="news-feed">
              {loadingNews ? (
                <>
                  <div className="skeleton-card"></div>
                  <div className="skeleton-card"></div>
                </>
              ) : (
                newsList.map((item, idx) => (
                  <a key={idx} href={item.link} target="_blank" rel="noopener noreferrer" className="news-card">
                    <div className="news-content">
                      <span className="news-source">{item.source}</span>
                      <h3 className="news-title">{item.title}</h3>
                      <p className="news-meta" style={{ marginBottom: "8px", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                        {item.description}
                      </p>
                      <span className="news-meta">{item.time}</span>
                    </div>
                    <div className="news-image-wrap">
                      <img src={item.image} alt={item.title} className="news-image" />
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          {/* Right Column: Market Intelligence & Institutional Consensus */}
          <aside className="sidebar-section">
            
            {/* Dynamic AI Analysis Panel (VN Broad Market Perspective) */}
            <div className="widget-panel" style={{ borderLeft: "4px solid var(--accent-red)", background: "var(--bg-paper-darker)" }}>
              <div className="widget-header" style={{ marginBottom: "0.75rem" }}>
                <h3 style={{ textTransform: "uppercase", fontSize: "0.9rem", letterSpacing: "1px", color: "var(--accent-red)", fontFamily: "var(--font-sans)" }}>
                  Morning Market Summary
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    VN-30 Market Breadth:
                  </strong>
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "0.85rem", fontWeight: "700" }}>
                    <span className="ticker-change positive" style={{ padding: "2px 8px", borderRadius: "4px" }}>
                      Tăng: {analysis.advancing}
                    </span>
                    <span className="ticker-change negative" style={{ padding: "2px 8px", borderRadius: "4px" }}>
                      Giảm: {analysis.declining}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: "600", display: "inline-block", marginTop: "6px", color: "var(--text-secondary)" }}>
                    Khái quát chung: {analysis.sentiment}
                  </span>
                </div>
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Primary Daily Theme:
                  </strong>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: "700", display: "block", marginTop: "2px" }}>
                    {analysis.theme}
                  </span>
                </div>
                <hr style={{ border: "none", borderTop: "1px dashed var(--border-classic)", margin: "4px 0" }} />
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>
                    Executive Briefing:
                  </strong>
                  <p style={{ lineHeight: "1.5", fontSize: "0.88rem", fontStyle: "italic", fontFamily: "var(--font-serif)", color: "var(--text-secondary)" }}>
                    "{analysis.summary}"
                  </p>
                </div>
              </div>
            </div>

            {/* Market Indexes Panel */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>Market Indexes</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loadingStocks ? (
                  <>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                  </>
                ) : (
                  tickerList.filter(item => item.sector === "Index").map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: idx < tickerList.filter(i => i.sector === "Index").length - 1 ? "1px dashed var(--border-classic)" : "none" }}>
                      <div className="crypto-info">
                        <h4 style={{ fontSize: "0.88rem", fontWeight: "600" }}>{item.symbol}</h4>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "500" }}>{item.ticker.startsWith("^") ? "Yahoo Finance" : "Entrade API"}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <h4 style={{ fontSize: "0.88rem", fontWeight: "700" }}>{item.price}</h4>
                        <span className={`ticker-change ${item.isPositive ? "positive" : "negative"}`} style={{ fontSize: "0.78rem" }}>
                          {item.change}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Broker Stance Panel: Stated bullish/bearish/neutral from securities firms */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>Institutional Market Consensus</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {brokerOutlooks.map((broker, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "10px", borderBottom: idx < brokerOutlooks.length - 1 ? "1px dashed var(--border-classic)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{broker.name}</strong>
                      <span className={`ticker-change ${broker.class}`} style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        {broker.stance}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>
                      Vùng điểm kỳ vọng: {broker.targetRange}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic", lineHeight: "1.4" }}>
                      "{broker.quote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top VN Stocks List */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>VN-30 Highlights</h3>
              </div>
              <div className="crypto-list" style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
                {loadingStocks ? (
                  <>
                    <div className="skeleton-item"></div>
                    <div className="skeleton-item"></div>
                  </>
                ) : (
                  tickerList.filter(item => item.sector !== "Index").map((item, idx) => (
                    <div key={idx} className="crypto-item">
                      <div className="crypto-info">
                        <h4>{item.symbol.split(" ")[0]}</h4>
                        <p style={{ fontSize: "0.7rem" }}>{item.sector}</p>
                      </div>
                      <div className="crypto-price-info">
                        <h4 style={{ fontSize: "0.88rem" }}>{item.price}</h4>
                        <span className={`ticker-change ${item.isPositive ? "positive" : "negative"}`} style={{ fontSize: "0.78rem" }}>
                          {item.change}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </aside>

        </div>
      </main>

      {/* Footer */}
      <footer className="ft-footer">
        <p>© 2026 THE MORNING BRIEF. Styled in FT-Modern Paper aesthetic.</p>
      </footer>
    </div>
  );
}
