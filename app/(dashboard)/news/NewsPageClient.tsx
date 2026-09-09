// app/(dashboard)/news/NewsPageClient.tsx
// Client-side Suspense boundary for the news page. `NewsFeed` reads
// `useSearchParams()`, which requires a Suspense boundary so the statically
// rendered route can bail out and hydrate the dynamic filter UI.
"use client";

import { Suspense } from "react";
import NewsSection from "@/components/sections/NewsSection";

function LoadingFallback() {
  return (
    <div className="state-panel" role="status">
      <strong>Loading the reading room</strong>
      Preparing news and source filters.
    </div>
  );
}

export default function NewsPageClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewsSection />
    </Suspense>
  );
}