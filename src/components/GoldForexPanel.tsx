"use client";
import React from 'react';

export interface GoldForexData {
  goldSjc: { buy: string; sell: string; change: string };
  goldRing: { buy: string; sell: string; change: string };
  usdRate: { buy: string; sell: string; change: string };
  updatedAt: string;
}

interface GoldForexPanelProps {
  loadingMacro: boolean;
  macroData: GoldForexData | null;
  lang: "vi" | "en";
  trans: any;
  activeMobileTab: string;
}

export const GoldForexPanel: React.FC<GoldForexPanelProps> = React.memo(({
  loadingMacro,
  macroData,
  lang,
  trans,
  activeMobileTab
}) => {
  return (
    <div className={`widget-panel ${activeMobileTab === "markets" ? "mobile-tab-animate" : "hidden-mobile"}`}>
      <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
        <h3>
          <img src="/icon/landmark-icon.png" className="header-3d-icon" alt="" />
          {trans[lang].goldForex}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
        {loadingMacro ? (
          <>
            <div className="skeleton-item" style={{ height: "30px" }}></div>
            <div className="skeleton-item" style={{ height: "30px" }}></div>
          </>
        ) : macroData ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed var(--border-classic)" }}>
              <div>
                <strong style={{ display: "block" }}>{lang === "vi" ? "Vàng SJC" : "SJC Gold Bar"}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {lang === "vi" ? "Đơn vị: Triệu đ/lượng" : "Unit: Million VND/Tael"}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: "700", display: "block" }}>{macroData.goldSjc.buy} - {macroData.goldSjc.sell}</span>
                <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0 }}>{macroData.goldSjc.change}</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px dashed var(--border-classic)" }}>
              <div>
                <strong style={{ display: "block" }}>{lang === "vi" ? "Vàng Nhẫn 9999" : "24K Gold Ring"}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {lang === "vi" ? "Đơn vị: Triệu đ/lượng" : "Unit: Million VND/Tael"}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: "700", display: "block" }}>{macroData.goldRing.buy} - {macroData.goldRing.sell}</span>
                <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0 }}>{macroData.goldRing.change}</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "block" }}>{lang === "vi" ? "Tỷ giá USD/VND" : "USD/VND Rate"}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {lang === "vi" ? "Nguồn: Vietcombank" : "Source: Vietcombank"}
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: "700", display: "block" }}>{macroData.usdRate.buy} - {macroData.usdRate.sell}</span>
                <span className="ticker-change positive" style={{ fontSize: "0.72rem", background: "transparent", padding: 0, color: "var(--success-green)" }}>{macroData.usdRate.change}</span>
              </div>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "right", marginTop: "4px" }}>
              {lang === "vi" ? "Cập nhật" : "Updated"}: {macroData.updatedAt}
            </div>
          </>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
            {lang === "vi" ? "Không tải được dữ liệu vĩ mô" : "Failed to load macro data"}
          </div>
        )}
      </div>
    </div>
  );
});

GoldForexPanel.displayName = "GoldForexPanel";
