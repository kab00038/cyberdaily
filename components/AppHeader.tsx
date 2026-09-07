// components/AppHeader.tsx — Consolidated dashboard header.
// Shows a mobile-only hamburger that opens the navigation drawer, a page
// title derived from the current route, and the current UTC time.
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
  const [now, setNow] = useState<Date | null>(null);

  // Single client-side interval started at mount. We render nothing for the
  // time until after mount so the server and client markup stay in sync.
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const title = TITLES[pathname] ?? "Today";
  const timeLabel = now
    ? now.toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false })
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
        </div>
      </div>
    </header>
  );
}