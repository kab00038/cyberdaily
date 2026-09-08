// components/sections/NewsSection.tsx
"use client";

import NewsFeed from "@/components/NewsFeed";

export default function NewsSection() {
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">News</h1>
        <p className="page-subtitle">
          Searchable cybersecurity news from RSS feeds
        </p>
      </header>
      <div className="page-body">
        <div className="panel rounded-lg overflow-hidden">
          <div className="panel-body">
            <NewsFeed />
          </div>
        </div>
      </div>
    </>
  );
}