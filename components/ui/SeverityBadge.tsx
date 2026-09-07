// components/ui/SeverityBadge.tsx
// Shared severity pill. Colors map to the semantic CSS variables defined in
// app/globals.css (--cd-critical/high/medium/low/unknown) so severity styling
// stays consistent across every surface in the app.

interface SeverityBadgeProps {
  severity: string | null;
  /** Optional CVSS base score (0–10). Rendered to one decimal when valid. */
  score?: number | null;
}

const SEVERITY_CONFIG = {
  CRITICAL: { label: "Critical", variable: "var(--cd-critical)" },
  HIGH: { label: "High", variable: "var(--cd-high)" },
  MEDIUM: { label: "Medium", variable: "var(--cd-medium)" },
  LOW: { label: "Low", variable: "var(--cd-low)" },
  UNKNOWN: { label: "Unrated", variable: "var(--cd-unknown)" },
} as const;

type SeverityKey = keyof typeof SEVERITY_CONFIG;

function normalizeSeverity(severity: string | null): SeverityKey {
  const key = severity?.trim().toUpperCase() ?? "";
  return key in SEVERITY_CONFIG ? (key as SeverityKey) : "UNKNOWN";
}

export default function SeverityBadge({
  severity,
  score = null,
}: SeverityBadgeProps) {
  const key = normalizeSeverity(severity);
  const { label, variable } = SEVERITY_CONFIG[key];

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[13px] font-medium"
      style={{ color: variable, borderColor: variable }}
    >
      {typeof score === "number" && score >= 0 && score <= 10 && (
        <span className="font-mono">{score.toFixed(1)}</span>
      )}
      <span>{label}</span>
    </span>
  );
}