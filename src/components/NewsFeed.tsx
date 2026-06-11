"use client";
import React from 'react';

export interface NewsItem {
  source: string;
  title: string;
  description: string;
  link: string;
  time: string;
  image: string;
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
          {newsList.slice(0, visibleNewsCount).map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => openArticle(item)} 
              className="news-card" 
              style={{ cursor: "pointer" }}
            >
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
            </div>
          ))}
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
