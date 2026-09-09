// components/Sidebar.tsx — Desktop sidebar navigation.
// Uses real routes via Next Link + usePathname. Width is driven by the
// `--sidebar-width` variable set on `.app-shell` (240px expanded / 80px
// collapsed); the mobile drawer is a separate dialog component.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/components/navigation";
import SourceHealthIndicator from "@/components/SourceHealthIndicator";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const scope = pathname.startsWith("/cve/") || pathname === "/threats"
    ? "NVD · CISA KEV · FIRST EPSS"
    : pathname === "/news"
      ? "Security RSS · Latest snapshot"
      : pathname === "/community"
        ? "Hacker News · Reddit RSS"
        : pathname === "/analytics"
          ? "NVD · 14-day loaded dataset"
          : pathname === "/sources"
            ? "Upstream provenance · Live probes"
            : "News · Vulnerabilities · Community";

  return (
    <div className="sidebar-content">
      {/* Logo */}
      <div className="flex items-center justify-between gap-1 px-4 py-5 border-b border-ui-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="brand-mark" aria-hidden="true">cd</span>
            <div>
              <span className="brand-wordmark">CyberDaily</span>
              <p className="text-[11px] text-ui-muted font-mono mt-1">Anarisk</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`icon-button ${collapsed ? "mx-auto" : ""}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Primary" className="px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className="nav-link"
            >
              <span className="relative flex-shrink-0" aria-hidden="true">
                {item.icon}
              </span>
              <span className={`relative text-sm font-medium ${collapsed ? "sr-only" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Status indicator — evidence-backed source health, not a static badge */}
      <div className="sidebar-footer">
        {!collapsed && <p className="text-[11px] leading-relaxed text-ui-muted font-mono mb-4">{scope}</p>}
        {!collapsed && <SourceHealthIndicator variant="panel" />}
      </div>
    </div>
  );
}