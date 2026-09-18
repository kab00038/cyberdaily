// components/ui/DistributionList.tsx
// Framework-light horizontal distribution list. Each row has three explicit
// regions — label (left, fixed readable width), bar (middle, flexible),
// value (right, exact count + percent) — so labels never overlap bars.

import type { ReactNode } from "react";

type DistributionRow = {
  id: string;
  label: ReactNode;
  count: number;
  color?: string; // CSS color string; defaults to var(--cd-accent)
};

export function DistributionList({
  rows,
  total,
  stacked = false,
}: {
  rows: DistributionRow[];
  total: number;
  // Stacks the label on its own full-width line above the track/value,
  // instead of sharing a fixed-width label column — for labels too long
  // to fit there (e.g. "CWE-787 — Out-of-bounds Write"). Same underlying
  // grammar, just more room for the label.
  stacked?: boolean;
}) {
  if (total <= 0) {
    return <p className="metadata">No records in this dataset.</p>;
  }
  return (
    <ul
      className={
        stacked ? "distribution-list distribution-list--stacked" : "distribution-list"
      }
    >
      {rows.map((row) => {
        const percent = (row.count / total) * 100;
        const widthPct = Math.min(100, Math.max(0, percent));
        return (
          <li key={row.id} className="distribution-row">
            <span className="distribution-label">{row.label}</span>
            <span className="distribution-track" aria-hidden="true">
              <span
                className="distribution-fill"
                style={{
                  width: `${widthPct}%`,
                  background: row.color ?? "var(--cd-accent)",
                }}
              />
            </span>
            <span className="distribution-value numeric">
              {row.count.toLocaleString("en-US")} · {percent.toFixed(1)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}