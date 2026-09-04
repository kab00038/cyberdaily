// components/sections/NewsSection.tsx
"use client";

import NewsFeed from "@/components/NewsFeed";

export default function NewsSection() {
  return (
    <div className="panel rounded-lg overflow-hidden">
      <div className="panel-header p-4">
        <h2 className="text-sm font-semibold text-[#F0E8E0] flex items-center gap-2 uppercase tracking-widest">
          <svg className="w-4 h-4 text-[#E8531E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          Cybersecurity Intelligence Feed
        </h2>
      </div>
      <div className="p-4">
        <NewsFeed />
      </div>
    </div>
  );
}
