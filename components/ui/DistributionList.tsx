// components/ui/DistributionList.tsx
// Framework-light horizontal distribution list. Each row has three explicit
// regions — label (left, fixed readable width), bar (middle, flexible),
// value (right, exact count + percent) — so labels never overlap bars.

type DistributionRow = {
  id: string;
  label: string;
  count: number;
  color?: string; // CSS color string; defaults to var(--cd-accent)
};

export function DistributionList({
  rows,
  total,
}: {
  rows: DistributionRow[];
  total: number;
}) {
  if (total <= 0) {
    return <p className="metadata">No records in this dataset.</p>;
  }
  return (
    <ul className="distribution-list">
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