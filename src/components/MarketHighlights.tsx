"use client";
import React from 'react';

export interface TickerItem {
  symbol: string;
  ticker: string;
  price: string;
  change: string;
  isPositive: boolean;
  sector: string;
  exchange?: string;
  history?: number[];
  volume?: string | number;
  volumeStr?: string;
}

interface MarketHighlightsProps {
  loadingStocks: boolean;
  stockFilterTab: "all" | "gainers" | "losers" | "volume";
  tickerList: TickerItem[];
  highlights: {
    gainers: TickerItem[];
    losers: TickerItem[];
    volume: TickerItem[];
  } | null;
  lang: "vi" | "en";
  trans: any;
  setStockFilterTab: (tab: "all" | "gainers" | "losers" | "volume") => void;
  activeMobileTab: string;
}

export const getStockColorClass = (item: TickerItem) => {
  if (item.sector === "Chỉ số") {
    return item.isPositive ? "positive" : "negative";
  }
  try {
    const pct = parseFloat(item.change.replace("%", ""));
    if (isNaN(pct)) return item.isPositive ? "positive" : "negative";
    
    const ex = item.exchange || "HOSE";
    if (ex === "HOSE") {
      if (pct >= 6.85) return "ceiling";
      if (pct <= -6.85) return "floor";
    } else if (ex === "HNX") {
      if (pct >= 9.85) return "ceiling";
      if (pct <= -9.85) return "floor";
    } else if (ex === "UPCoM") {
      if (pct >= 14.85) return "ceiling";
      if (pct <= -14.85) return "floor";
    }
  } catch (e) {
    console.error("Error parsing stock change percentage:", e);
  }
  return item.isPositive ? "positive" : "negative";
};

export const MarketHighlights: React.FC<MarketHighlightsProps> = React.memo(({
  loadingStocks,
  stockFilterTab,
  tickerList,
  highlights,
  lang,
  trans,
  setStockFilterTab,
  activeMobileTab
}) => {
  const renderStockTable = (list: TickerItem[], showVolume: boolean = false) => {
    if (!list || list.length === 0) {
      return (
        <div style={{ padding: "20px", textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          {lang === "vi" ? "Đang tải dữ liệu..." : "Loading data..."}
        </div>
      );
    }
    return (
      <div className="highlights-detailed-table-wrap">
        <table className="highlights-detailed-table">
          <thead>
            <tr>
              <th>{lang === "vi" ? "Mã" : "Symbol"}</th>
              <th style={{ textAlign: "right" }}>{lang === "vi" ? "Giá" : "Price"}</th>
              <th style={{ textAlign: "right" }}>{lang === "vi" ? "Tăng/Giảm" : "Change"}</th>
              {showVolume && <th style={{ textAlign: "right" }}>{lang === "vi" ? "Khối lượng" : "Volume"}</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((item, idx) => {
              const code = item.symbol;
              const colorClass = getStockColorClass(item);
              return (
                <tr key={idx}>
                  <td>
                    <span className="stock-table-symbol">{code}</span>
                    <span className="stock-table-exchange">{item.exchange}</span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: "700" }}>{item.price}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={`ticker-change ${colorClass}`} style={{ fontSize: "0.78rem" }}>
                      {item.change}
                    </span>
                  </td>
                  {showVolume && (
                    <td style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {item.volumeStr || item.volume || "0"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`widget-panel ${activeMobileTab === "markets" ? "mobile-tab-animate" : "hidden-mobile"}`}>
      <div className="widget-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.85rem", letterSpacing: "1.5px" }}>
          <img src="/icon/stock-tickers-icon.png" className="header-3d-icon" style={{ width: '16px', height: '16px', marginRight: '6px' }} alt="" />
          {trans[lang].marketHighlights}
        </h3>
        
        {/* Sub-tabs for Market Highlights */}
        <div className="tabs" style={{ padding: "2px", borderRadius: "20px" }}>
          <button
            className={`tab ${stockFilterTab === "all" ? "active" : ""}`}
            onClick={() => setStockFilterTab("all")}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
          >
            {trans[lang].allTab}
          </button>
          <button
            className={`tab ${stockFilterTab === "gainers" ? "active" : ""}`}
            onClick={() => setStockFilterTab("gainers")}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
          >
            {trans[lang].gainerTab}
          </button>
          <button
            className={`tab ${stockFilterTab === "losers" ? "active" : ""}`}
            onClick={() => setStockFilterTab("losers")}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
          >
            {trans[lang].loserTab}
          </button>
          <button
            className={`tab ${stockFilterTab === "volume" ? "active" : ""}`}
            onClick={() => setStockFilterTab("volume")}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", borderRadius: "15px" }}
          >
            {trans[lang].volumeTab}
          </button>
        </div>
      </div>

      {/* === TOP 5 GAINERS & LOSERS LEADERBOARD === */}
      {!loadingStocks && stockFilterTab === "all" && (() => {
        const stocksOnly = tickerList.filter(item => item.sector !== "Chỉ số");
        const parseChangePercent = (s: string) => { try { return parseFloat(s.replace("%", "")); } catch { return 0; } };
        const sorted = [...stocksOnly].sort((a, b) => parseChangePercent(b.change) - parseChangePercent(a.change));

        const top5Gainers = (highlights && highlights.gainers && highlights.gainers.length > 0)
          ? highlights.gainers.slice(0, 5)
          : sorted.filter(s => parseChangePercent(s.change) > 0).slice(0, 5);

        const top5Losers = (highlights && highlights.losers && highlights.losers.length > 0)
          ? highlights.losers.slice(0, 5)
          : sorted.filter(s => parseChangePercent(s.change) < 0).reverse().slice(0, 5);

        const renderLeaderItem = (item: TickerItem, rank: number, type: "gainer" | "loser") => {
          const code = item.symbol.split(" ")[0];
          const exTag = item.exchange ? ` ${item.exchange}` : "";
          const colorClass = getStockColorClass(item);
          const typeMapped = type === "gainer" ? "gainers" : "losers";
          return (
            <div key={`${typeMapped}-${code}-${rank}`} className={`leaderboard-item ${typeMapped}`}>
              <div className="leaderboard-rank">{rank}</div>
              <div className="leaderboard-info">
                <span className="leaderboard-code">{code}</span>
                <span className="leaderboard-exchange">{exTag}</span>
              </div>
              <div className="leaderboard-price">{item.price}</div>
              <div className={`leaderboard-change ticker-change ${colorClass}`}>
                {item.change}
              </div>
            </div>
          );
        };

        return (
          <div className="leaderboard-grid">
            <div className="leaderboard-column">
              <div className="leaderboard-column-header gainers" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span className="leaderboard-icon">🌱</span>
                <span>{lang === "vi" ? "TĂNG" : "GAINERS"}</span>
              </div>
              {top5Gainers.length > 0 ? (
                top5Gainers.map((item, i) => renderLeaderItem(item, i + 1, "gainer"))
              ) : (
                <div className="leaderboard-empty">{lang === "vi" ? "Không có mã tăng" : "No Gainers"}</div>
              )}
            </div>
            <div className="leaderboard-column">
              <div className="leaderboard-column-header losers" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span className="leaderboard-icon">🍂</span>
                <span>{lang === "vi" ? "GIẢM" : "LOSERS"}</span>
              </div>
              {top5Losers.length > 0 ? (
                top5Losers.map((item, i) => renderLeaderItem(item, i + 1, "loser"))
              ) : (
                <div className="leaderboard-empty">{lang === "vi" ? "Không có mã giảm" : "No Losers"}</div>
              )}
            </div>
          </div>
        );
      })()}

      {!loadingStocks && stockFilterTab === "gainers" && (
        renderStockTable(highlights?.gainers || [])
      )}

      {!loadingStocks && stockFilterTab === "losers" && (
        renderStockTable(highlights?.losers || [])
      )}

      {!loadingStocks && stockFilterTab === "volume" && (
        renderStockTable(highlights?.volume || [], true)
      )}

      <div style={{
        marginTop: "10px",
        paddingTop: "6px",
        borderTop: "1px dashed var(--border)",
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.7rem",
        color: "var(--text-muted)"
      }}>
        <span>Nguồn: CafeF / Entrade</span>
        <span>Cập nhật: {new Date().toLocaleTimeString("vi-VN")}</span>
      </div>
    </div>
  );
});

MarketHighlights.displayName = "MarketHighlights";
