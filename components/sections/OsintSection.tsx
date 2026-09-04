// components/sections/OsintSection.tsx
"use client";

import HackerNewsFeed from "@/components/HackerNewsFeed";
import OsintFeed from "@/components/OsintFeed";

export default function OsintSection() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <HackerNewsFeed />
      <OsintFeed />
    </div>
  );
}
