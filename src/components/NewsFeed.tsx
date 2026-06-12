"use client";
import React from 'react';

export interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  time: string;
  image?: string;
  body?: string[];
}

interface NewsFeedProps {
  loadingNews: boolean;
  newsList: NewsItem[];
  visibleNewsCount: number;
  lang: "vi" | "en";
  trans: any;
  openArticle: (item: NewsItem) => void;
  setVisibleNewsCount: React.Dispatch<React.SetStateAction<number>>;
}

const hasDisplayImage = (image?: string): boolean => {
  const normalized = image?.trim().toLowerCase();
  if (!normalized || normalized === "#" || normalized === "about:blank") return false;
  return !normalized.includes("news_image_default") && !normalized.includes("photo-1590283603385");
};

export const NewsFeed: React.FC<NewsFeedProps> = React.memo(({
  loadingNews,
  newsList,
  visibleNewsCount,
  lang,
  trans,
  openArticle,
  setVisibleNewsCount
}) => {
  return (
    <div className="news-feed">
      {loadingNews ? (
        <>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </>
      ) : (
        <>
          {newsList.length === 0 && (
            <div className="news-empty-state">
              {lang === "vi"
                ? "Chưa tải được bài báo từ nguồn tin. Vui lòng thử lại sau."
                : "News is temporarily unavailable. Please try again later."}
            </div>
          )}
          {newsList.slice(0, visibleNewsCount).map((item, idx) => {
            const hasImage = hasDisplayImage(item.image);
            return (
              <div
                key={item.link || `${item.title}-${idx}`}
                onClick={() => openArticle(item)}
                className={`news-card ${hasImage ? "" : "no-image"}`}
                style={{ cursor: "pointer" }}
              >
                <div className="news-content">
                  <span className="news-source">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      style={{ color: "inherit", textDecoration: "underline" }}
                    >
                      {lang === "vi" ? "Nguồn gốc" : "Source"}: {item.source}
                    </a>
                  </span>
                  <h3 className="news-title">{item.title}</h3>
                  {item.description && (
                    <p className="news-meta news-summary">
                      {item.description}
                    </p>
                  )}
                  <span className="news-meta">{lang === "vi" ? "Đăng lúc" : "Published"}: {item.time}</span>
                </div>
                {hasImage && (
                  <div className="news-image-wrap">
                    <img src={item.image} alt={item.title} className="news-image" />
                  </div>
                )}
              </div>
            );
          })}
          {newsList.length > visibleNewsCount && (
            <button 
              className="load-more-news-btn"
              onClick={() => setVisibleNewsCount(prev => prev + 6)}
            >
              {trans[lang].loadMore}
            </button>
          )}
        </>
      )}
    </div>
  );
});

NewsFeed.displayName = "NewsFeed";
