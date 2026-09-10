// components/news/NewsRow.tsx
// Presentational row for a single news item. No data fetching, no state,
// no dangerouslySetInnerHTML. The parent supplies the already-formatted
// relative/absolute date label so rendering stays server-consistent.

import Image from "next/image";
import Link from "next/link";
import type { NewsItem } from "@/lib/rss";

export interface NewsRowProps {
  item: NewsItem;
  /** Already-formatted relative/absolute date, computed by the parent. */
  dateLabel: string;
}

export default function NewsRow({ item, dateLabel }: NewsRowProps) {
  return (
    <article className="news-row interactive-row flex gap-5 border-b border-ui-border last:border-b-0">
      {/* Left column: metadata, headline, description, references */}
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

        <p className="mt-1 text-sm leading-relaxed text-ui-secondary line-clamp-2">
          {item.snippet}
        </p>

        {/* Identifiers the source named explicitly. The label states the
            relationship — a reference — without implying severity,
            exploitation, or that the reader is affected. */}
        {item.cveIds.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] text-ui-muted">References</span>
            {item.cveIds.map((cveId) => (
              <Link key={cveId} href={`/cve/${cveId}`} className="cve-ref">
                {cveId}
                <span className="sr-only"> — open vulnerability record</span>
              </Link>
            ))}
          </div>
        )}

        {item.aiSummary != null && (
          <p className="mt-2 text-xs text-ui-muted">AI summary · verify with source</p>
        )}
      </div>

      {/* Right optional thumbnail — decorative, hidden on small screens.
          `unoptimized` because these are remote RSS thumbnails we don't
          control; the optimizer would re-fetch and re-encode them anyway. */}
      {item.thumbnail && (
        <Image
          src={item.thumbnail}
          alt=""
          width={96}
          height={72}
          unoptimized
          loading="lazy"
          decoding="async"
          className="hidden sm:block w-24 h-[72px] object-cover rounded flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </article>
  );
}
