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
  history?: number[];
}

// Helper to get Vietnamese date labels for trading days
function getTradingDays(count: number) {
  if (count <= 0) return [];
  const dates: string[] = [];
  let current = new Date();
  
  while (dates.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Skip Saturday and Sunday
      dates.unshift(current.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }));
    }
    current.setDate(current.getDate() - 1);
  }
  return dates;
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
  const [visibleNewsCount, setVisibleNewsCount] = useState(8);
  const [selectedChartIndex, setSelectedChartIndex] = useState("VN-Index");
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; index: number; x: number; y: number } | null>(null);
  const [isChartTransitioning, setIsChartTransitioning] = useState(false);

  // Format Date in traditional FT format (Vietnamese Locale)
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    setDateText(new Date().toLocaleDateString("vi-VN", options));
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
    setVisibleNewsCount(8);
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

    let sentiment = "GIẰNG CO (TRUNG LẬP)";
    let sentimentClass = "neutral-stance";
    if (greenRatio >= 60) {
      sentiment = `TÍCH CỰC (TĂNG) — ${advancing}/${equities.length} mã tăng điểm`;
      sentimentClass = "positive-stance";
    } else if (greenRatio <= 40) {
      sentiment = `THẬN TRỌNG (GIẢM) — ${declining}/${equities.length} mã giảm điểm`;
      sentimentClass = "negative-stance";
    } else {
      sentiment = `GIẰNG CO (TRUNG LẬP) — ${advancing} mã tăng / ${declining} mã giảm`;
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
          <div className="date-badge">{dateText || "Đang tải ngày..."}</div>
          <div className="logo">
            <h1>THE MORNING BRIEF</h1>
          </div>
          <div className="user-profile">
            <div className="avatar" onClick={fetchStocks} title="Tải lại dữ liệu">↻</div>
          </div>
        </div>

        {/* Animated Market Ticker Banner */}
        <div className="ticker-wrap">
          <div className="ticker-label">THỊ TRƯỜNG VN</div>
          <div className={`ticker-scroll ${loadingStocks ? "loading" : ""}`}>
            {loadingStocks ? (
              <div className="ticker-item-placeholder">Đang tải dữ liệu thị trường...</div>
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
              <h2>Tin nổi bật & Phân tích</h2>
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "general" ? "active" : ""}`}
                  onClick={() => setActiveTab("general")}
                >
                  Tiêu điểm
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
                <>
                  {newsList.slice(0, visibleNewsCount).map((item, idx) => (
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
                  ))}
                  {newsList.length > visibleNewsCount && (
                    <button 
                      className="see-more-btn"
                      onClick={() => setVisibleNewsCount(prev => prev + 6)}
                    >
                      Xem thêm tin cũ hơn
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Right Column: Market Intelligence & Institutional Consensus */}
          <aside className="sidebar-section">
            
            {/* Dynamic AI Analysis Panel (VN Broad Market Perspective) */}
            <div className="widget-panel" style={{ borderLeft: "4px solid var(--accent-red)", background: "var(--bg-paper-darker)" }}>
              <div className="widget-header" style={{ marginBottom: "0.75rem" }}>
                <h3 style={{ textTransform: "uppercase", fontSize: "0.9rem", letterSpacing: "1px", color: "var(--accent-red)", fontFamily: "var(--font-sans)" }}>
                  Báo cáo Thị trường Buổi sáng
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.9rem" }}>
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                    Độ rộng thị trường VN-30:
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
                    Chủ đề chính trong ngày:
                  </strong>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.05rem", fontWeight: "700", display: "block", marginTop: "2px" }}>
                    {analysis.theme}
                  </span>
                </div>
                <hr style={{ border: "none", borderTop: "1px dashed var(--border-classic)", margin: "4px 0" }} />
                <div>
                  <strong style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>
                    Báo cáo nhanh:
                  </strong>
                  <p style={{ lineHeight: "1.5", fontSize: "0.88rem", fontStyle: "italic", fontFamily: "var(--font-serif)", color: "var(--text-secondary)" }}>
                    "{analysis.summary}"
                  </p>
                </div>
              </div>
            </div>

            {/* Market Trend Chart Panel */}
            <div className="widget-panel">
              <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
                <h3>Xu hướng Chỉ số</h3>
              </div>
              
              <div className="chart-widget-panel">
                <div className="chart-tabs">
                  {["VN-Index", "HNX-Index", "UPCoM-Index"].map((name) => (
                    <button
                      key={name}
                      className={`chart-tab-btn ${selectedChartIndex === name ? "active" : ""}`}
                      onClick={() => {
                        setIsChartTransitioning(true);
                        setSelectedChartIndex(name);
                        setHoveredPoint(null);
                        setTimeout(() => setIsChartTransitioning(false), 200);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {(() => {
                  const chartTicker = tickerList.find((t) => t.symbol === selectedChartIndex);
                  
                  if (loadingStocks) {
                    return (
                      <div className="chart-svg-container">
                        <div className="skeleton-item" style={{ width: "100%", height: "100px", border: "none" }}></div>
                      </div>
                    );
                  }

                  if (!chartTicker || !chartTicker.history || chartTicker.history.length === 0) {
                    return (
                      <div className="chart-svg-container" style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                        Không có dữ liệu xu hướng cho {selectedChartIndex}
                      </div>
                    );
                  }

                  const history = chartTicker.history;
                  const isPositive = chartTicker.isPositive;
                  const lineColor = isPositive ? "var(--success-green)" : "var(--danger-red)";
                  const areaGradientId = `chart-area-grad-${selectedChartIndex.replace(/\s+/g, "-")}`;
                  
                  const min = Math.min(...history);
                  const max = Math.max(...history);
                  const range = max - min === 0 ? 1 : max - min;
                  
                  const width = 320;
                  const height = 130;
                  const paddingTop = 12;
                  const paddingBottom = 18;
                  const paddingLeft = 12;
                  const paddingRight = 12;

                  const points = history.map((val, idx) => {
                    const x = paddingLeft + (idx / (history.length - 1)) * (width - paddingLeft - paddingRight);
                    const y = height - paddingBottom - ((val - min) / range) * (height - paddingTop - paddingBottom);
                    return { x, y, val, idx };
                  });

                  // Cubic Bezier curve generator for smooth drawing
                  const getBezierPath = (pts: typeof points) => {
                    if (pts.length === 0) return "";
                    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const p0 = pts[i];
                      const p1 = pts[i + 1];
                      const cp1x = p0.x + (p1.x - p0.x) / 3;
                      const cp1y = p0.y;
                      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
                      const cp2y = p1.y;
                      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
                    }
                    return path;
                  };

                  const smoothLinePath = getBezierPath(points);
                  const smoothAreaPath = `${smoothLinePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`;

                  const dates = getTradingDays(history.length);
                  
                  // Detail overlay when hovered or current details
                  const displayPrice = hoveredPoint ? hoveredPoint.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : chartTicker.price;
                  const displayDate = hoveredPoint ? `Phiên ${dates[hoveredPoint.index]}` : `Giá hiện tại`;
                  const changeColorClass = isPositive ? "positive" : "negative";

                  // Extra Stats for premium feel and functionality
                  const firstPrice = history[0];
                  const lastPrice = history[history.length - 1];
                  const netDiff = lastPrice - firstPrice;
                  const netPct = (netDiff / firstPrice) * 100;
                  const trendSign = netPct >= 0 ? "+" : "";
                  const trendColorClass = netPct >= 0 ? "positive" : "negative";
                  const rangeValue = max - min;

                  // Handle mouse movement for smooth continuous snapping
                  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
                    const svg = e.currentTarget;
                    const rect = svg.getBoundingClientRect();
                    const localX = ((e.clientX - rect.left) / rect.width) * width;
                    
                    let closestPt = points[0];
                    let minDist = Math.abs(points[0].x - localX);
                    
                    for (let i = 1; i < points.length; i++) {
                      const dist = Math.abs(points[i].x - localX);
                      if (dist < minDist) {
                        minDist = dist;
                        closestPt = points[i];
                      }
                    }
                    
                    setHoveredPoint({
                      value: closestPt.val,
                      index: closestPt.idx,
                      x: closestPt.x,
                      y: closestPt.y
                    });
                  };

                  return (
                    <div style={{ opacity: isChartTransitioning ? 0.4 : 1, transition: "opacity 0.20s ease-in-out" }}>
                      <div className="chart-info-header">
                        <div className="chart-info-left">
                          <h4 style={{ fontFamily: "var(--font-sans)", fontSize: "0.95rem", fontWeight: "700" }}>
                            {selectedChartIndex}
                          </h4>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "500" }}>
                            {displayDate}
                          </p>
                        </div>
                        <div className="chart-info-right">
                          <div className="chart-info-price" style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                            {displayPrice}
                          </div>
                          {!hoveredPoint && (
                            <span className={`ticker-change ${changeColorClass}`} style={{ fontSize: "0.78rem" }}>
                              {chartTicker.change}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="chart-svg-container" style={{ padding: "10px 4px 4px 4px" }}>
                        <svg
                          viewBox={`0 0 ${width} ${height}`}
                          className="chart-svg"
                          style={{ display: "block", width: "100%", height: "100%" }}
                          onMouseMove={handleMouseMove}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onTouchMove={(e) => {
                            if (e.touches && e.touches[0]) {
                              const touch = e.touches[0];
                              const svg = e.currentTarget;
                              const rect = svg.getBoundingClientRect();
                              const localX = ((touch.clientX - rect.left) / rect.width) * width;
                              
                              let closestPt = points[0];
                              let minDist = Math.abs(points[0].x - localX);
                              
                              for (let i = 1; i < points.length; i++) {
                                const dist = Math.abs(points[i].x - localX);
                                if (dist < minDist) {
                                  minDist = dist;
                                  closestPt = points[i];
                                }
                              }
                              
                              setHoveredPoint({
                                value: closestPt.val,
                                index: closestPt.idx,
                                x: closestPt.x,
                                y: closestPt.y
                              });
                            }
                          }}
                          onTouchEnd={() => setHoveredPoint(null)}
                        >
                          <defs>
                            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={lineColor} stopOpacity="0.16" />
                              <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1={0} y1={paddingTop} x2={width} y2={paddingTop} stroke="var(--border-classic)" strokeDasharray="3,3" strokeWidth="0.5" />
                          <line x1={0} y1={height - paddingBottom} x2={width} y2={height - paddingBottom} stroke="var(--border-classic)" strokeDasharray="3,3" strokeWidth="0.5" />
                          <line x1={0} y1={(paddingTop + height - paddingBottom) / 2} x2={width} y2={(paddingTop + height - paddingBottom) / 2} stroke="var(--border-classic)" strokeDasharray="3,3" strokeWidth="0.4" />

                          {/* Min/Max Text Labels */}
                          <text x={width - 2} y={paddingTop - 4} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="600">
                            Cao nhất: {max.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                          </text>
                          <text x={width - 2} y={height - paddingBottom + 12} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="600">
                            Thấp nhất: {min.toLocaleString("en-US", { maximumFractionDigits: 1 })}
                          </text>

                          {/* Date Range Labels at bottom */}
                          <text x={paddingLeft} y={height - 4} textAnchor="start" fontSize="8.5" fill="var(--text-muted)" fontWeight="500">
                            {dates[0]}
                          </text>
                          <text x={width - paddingRight} y={height - 4} textAnchor="end" fontSize="8.5" fill="var(--text-muted)" fontWeight="500">
                            {dates[dates.length - 1] || "Hôm nay"}
                          </text>

                          {/* Area Shading */}
                          <path d={smoothAreaPath} fill={`url(#${areaGradientId})`} style={{ transition: "d 0.3s ease" }} />

                          {/* Line Stroke */}
                          <path d={smoothLinePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "d 0.3s ease" }} />

                          {/* Hover Guide & Active Marker */}
                          {hoveredPoint && (
                            <>
                              <line
                                x1={hoveredPoint.x}
                                y1={paddingTop}
                                x2={hoveredPoint.x}
                                y2={height - paddingBottom}
                                stroke="var(--text-muted)"
                                strokeDasharray="3,3"
                                strokeWidth="0.75"
                              />
                              <circle
                                cx={hoveredPoint.x}
                                cy={hoveredPoint.y}
                                r="4.5"
                                fill={lineColor}
                                stroke="var(--bg-card)"
                                strokeWidth="2.5"
                                style={{ transition: "cx 0.1s ease, cy 0.1s ease" }}
                              />
                            </>
                          )}
                        </svg>
                      </div>

                      {/* Premium Stats Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "8px", marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed var(--border-classic)", fontSize: "0.78rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>Xu hướng 10N</span>
                          <span className={`ticker-change ${trendColorClass}`} style={{ background: "transparent", padding: 0, fontWeight: "700", fontSize: "0.85rem", marginTop: "2px" }}>
                            {trendSign}{netPct.toFixed(2)}%
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-classic)", paddingLeft: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>Đỉnh - Đáy (10N)</span>
                          <span style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.85rem", marginTop: "2px" }}>
                            {max.toFixed(0)} - {min.toFixed(0)}
                          </span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border-classic)", paddingLeft: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.3px" }}>Biến động 10N</span>
                          <span style={{ fontWeight: "700", color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
                            {rangeValue.toFixed(1)} điểm
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Market Indexes Panel */}
            <div className="widget-panel">
              <div className="widget-header">
                <h3>Chỉ số Thị trường</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {loadingStocks ? (
                  <>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                    <div className="skeleton-item" style={{ height: "40px" }}></div>
                  </>
                ) : (
                  tickerList.filter(item => item.sector === "Chỉ số").map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "10px", borderBottom: idx < tickerList.filter(i => i.sector === "Chỉ số").length - 1 ? "1px dashed var(--border-classic)" : "none" }}>
                      <div className="crypto-info">
                        <h4 style={{ fontSize: "0.88rem", fontWeight: "600" }}>{item.symbol}</h4>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: "500" }}>{item.ticker.startsWith("^") ? "Dữ liệu Yahoo Finance" : "Dữ liệu Entrade API"}</p>
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
                <h3>Đồng thuận Thị trường Định chế</h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {brokerOutlooks.map((broker, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "10px", borderBottom: idx < brokerOutlooks.length - 1 ? "1px dashed var(--border-classic)" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>{broker.name}</strong>
                      <span className={`ticker-change ${broker.class}`} style={{ fontSize: "0.72rem", padding: "1px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        {broker.stance === "BULLISH" ? "TÍCH CỰC" : broker.stance === "BEARISH" ? "THẬN TRỌNG" : "TRUNG LẬP"}
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
                <h3>Điểm nhấn VN-30</h3>
              </div>
              <div className="crypto-list" style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
                {loadingStocks ? (
                  <>
                    <div className="skeleton-item"></div>
                    <div className="skeleton-item"></div>
                  </>
                ) : (
                  tickerList.filter(item => item.sector !== "Chỉ số").map((item, idx) => (
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
        <p>© 2026 THE MORNING BRIEF. Thiết kế theo phong cách báo giấy hiện đại của FT.</p>
      </footer>
    </div>
  );
}
