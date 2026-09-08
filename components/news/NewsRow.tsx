// components/news/NewsRow.tsx
// Presentational row for a single news item. No data fetching, no state,
// no dangerouslySetInnerHTML. The parent supplies the already-formatted
// relative/absolute date label so rendering stays server-consistent.

import type { NewsItem } from "@/lib/rss";

export interface NewsRowProps {
  item: NewsItem;
  /** Already-formatted relative/absolute date, computed by the parent. */
  dateLabel: string;
}

export default function NewsRow({ item, dateLabel }: NewsRowProps) {
  return (
    <article className="interactive-row flex gap-5 border-b border-ui-border px-5 py-5 last:border-b-0">
      {/* Left column: metadata, headline, description, AI summary caption */}
      <div className="flex-1 min-w-0">
        <div className="metadata mb-1.5 flex items-center gap-1.5">
          <span className="font-medium text-ui-secondary">{item.source}</span>
          <span aria-hidden="true">·</span>
          <span className="numeric">{dateLabel}</span>
        </div>

        <h3 className="story-headline line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {item.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </h3>

        <p className="mt-1.5 text-[15px] leading-relaxed text-ui-muted line-clamp-2">
          {item.snippet}
        </p>

        {item.aiSummary != null && (
          <p className="mt-2 text-xs text-ui-accent/70">AI summary · verify with source</p>
        )}
      </div>

      {/* Right optional thumbnail — decorative, hidden on small screens */}
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          className="hidden sm:block w-24 h-24 object-cover rounded-lg flex-shrink-0 border border-ui-border"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </article>
  );
}