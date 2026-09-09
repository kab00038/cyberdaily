// components/sections/NewsSection.tsx
"use client";

import NewsFeed from "@/components/NewsFeed";

export default function NewsSection() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">The reading room / RSS feeds</p>
        <h1 className="page-title">News</h1>
        <p className="page-subtitle">
          Searchable cybersecurity news from RSS feeds
        </p>
      </header>
      <div className="page-body">
        <div className="panel flat-panel">
          <div className="panel-body">
            <NewsFeed />
          </div>
        </div>
      </div>
    </>
  );
}