"use client";
import React from 'react';

export interface CalendarEvent {
  date: string;
  event: string;
  impact: string;
  class: string;
  source: string;
  time: string;
  description: string;
  summary: string;
}

interface EconomicCalendarProps {
  calendarEvents: CalendarEvent[];
  lang: "vi" | "en";
  trans: any;
  handleCalendarClick: (item: CalendarEvent) => void;
}

export const EconomicCalendar: React.FC<EconomicCalendarProps> = React.memo(({
  calendarEvents,
  lang,
  trans,
  handleCalendarClick
}) => {
  return (
    <div className="widget-panel" style={{ marginTop: "2rem" }}>
      <div className="widget-header" style={{ marginBottom: "0.5rem" }}>
        <h3>
          <img src="/icon/calendar-icon.png" className="header-3d-icon" alt="" />
          {trans[lang].economicCalendar}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
        {calendarEvents.map((item, idx) => (
          <div 
            key={idx} 
            onClick={() => handleCalendarClick(item)}
            className="calendar-item-card"
            style={{ 
              display: "flex", 
              gap: "10px", 
              paddingBottom: "8px", 
              borderBottom: idx < calendarEvents.length - 1 ? "1px dashed var(--border-classic)" : "none",
              cursor: "pointer" 
            }}
          >
            <div className="calendar-date-badge">
              {item.date}
            </div>
            <div>
              <strong className="calendar-event-title" style={{ display: "block", color: "var(--text-primary)", fontSize: "0.8rem", lineHeight: "1.3", transition: "color 0.2s" }}>{item.event}</strong>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                <span className={`ticker-change ${item.class}`} style={{ fontSize: "0.65rem", padding: "1px 4px", borderRadius: "3px", fontWeight: "700" }}>
                  {lang === "vi" ? "Tác động" : "Impact"}: {item.impact === "LỚN" ? (lang === "vi" ? "LỚN" : "HIGH") : item.impact === "VỪA" ? (lang === "vi" ? "VỪA" : "MED") : (lang === "vi" ? "NHỎ" : "LOW")}
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  • {lang === "vi" ? "Nguồn" : "Source"}: {item.source}
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  • {lang === "vi" ? "Trạng thái: Dự kiến" : "Status: Tentative"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

EconomicCalendar.displayName = "EconomicCalendar";
