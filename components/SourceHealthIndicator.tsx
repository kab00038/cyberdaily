// components/SourceHealthIndicator.tsx — Evidence-backed source health.
// Polls `/api/sources` on mount and every 60 seconds, then renders the
// aggregate state (dot + label) as a link to the Sources page. Replaces the
// decorative "Operational" badge: the text is derived from real probe results,
// and only this indicator is an `aria-live` region (not the whole dashboard).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPublishedAt } from "@/lib/format";
import type { SourceStatus } from "@/lib/sources";

interface SourcesPayload {
  generatedAt?: string;
  sources?: SourceStatus[];
}

type HealthState = "loading" | "ok" | "partial" | "error";

interface HealthInfo {
  state: HealthState;
  label: string;
  lastChecked: string | null;
}

const DOT_CLASSES: Record<HealthState, string> = {
  loading: "bg-gray-500",
  ok: "bg-emerald-500",
  partial: "bg-amber-500",
  error: "bg-red-500",
};

export default function SourceHealthIndicator({
  variant = "panel",
}: {
  /** `panel` is the sidebar status card; `compact` fits the header. */
  variant?: "panel" | "compact";
}) {
  const [health, setHealth] = useState<HealthInfo>({
    state: "loading",
    label: "Checking sources…",
    lastChecked: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/sources");
        const data: SourcesPayload = await res.json();
        if (cancelled) return;
        const sources = data.sources ?? [];
        const hasError = sources.some((s) => s.status === "error");
        const hasPartial = sources.some((s) => s.status === "partial");
        setHealth({
          state: hasError ? "error" : hasPartial ? "partial" : "ok",
          label: hasError
            ? "Some sources unavailable"
            : hasPartial
              ? "Some sources partial"
              : "All sources operational",
          lastChecked: data.generatedAt ?? null,
        });
      } catch {
        if (!cancelled) {
          setHealth({
            state: "error",
            label: "Sources unavailable",
            lastChecked: null,
          });
        }
      }
    }

    check();
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const dotClass = DOT_CLASSES[health.state];
  const checkedLabel = health.lastChecked
    ? `last checked ${formatPublishedAt(health.lastChecked)}`
    : null;

  if (variant === "compact") {
    return (
      <Link
        href="/sources"
        aria-label={`${health.label}${checkedLabel ? `, ${checkedLabel}` : ""}. Open sources page.`}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{health.label}</span>
      </Link>
    );
  }

  return (
    <div aria-live="polite" className="panel p-3">
      <Link href="/sources" className="group flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${dotClass} opacity-60`}
            aria-hidden="true"
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotClass}`}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500">Source health</p>
          <p className="truncate text-[10px] font-mono text-emerald-500 transition-colors group-hover:text-emerald-300">
            {health.label}
          </p>
          {checkedLabel && (
            <p className="text-[9px] text-gray-600">{checkedLabel}</p>
          )}
        </div>
      </Link>
    </div>
  );
}