// components/AppHeader.tsx — Consolidated dashboard header.
// Shows a mobile-only hamburger that opens the navigation drawer, a page
// title derived from the current route, the page-load time in UTC (rendered
// once at mount, not ticked every second), and a Refresh button.
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "Today",
  "/news": "News",
  "/threats": "Vulnerabilities",
  "/community": "Community",
  "/analytics": "Analytics",
};

export default function AppHeader({
  mobileOpen,
  onToggleMobile,
}: {
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  const pathname = usePathname();
  // Stable reference clock set once on mount. Nothing renders until after
  // mount so the server and client markup stay in sync — and it never ticks.
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    setLoadedAt(new Date());
  }, []);

  const title = TITLES[pathname] ?? "Today";
  const timeLabel = loadedAt
    ? loadedAt.toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false })
    : "";

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F0E]/80 backdrop-blur-md border-b border-white/[0.06]">
      <div className="px-4 sm:px-6 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobile}
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-white capitalize font-display">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 font-mono">{timeLabel} UTC</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            aria-label="Refresh page"
            className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}