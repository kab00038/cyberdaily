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

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide font-display">CyberDaily</span>
              <p className="text-[10px] text-emerald-500 font-mono">Anarisk</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-200 transition-all duration-200 ${collapsed ? "mx-auto" : ""}`}
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
      <nav className="p-4 space-y-1.5">
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
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isActive ? "text-white" : "text-gray-500 hover:text-gray-200"
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-white/[0.08]" />
              )}
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-emerald-500 transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
              <span className={`relative flex-shrink-0 transition-colors ${isActive ? "text-emerald-500" : "group-hover:text-emerald-500"}`}>
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
      <div className="absolute bottom-5 left-0 right-0 px-5">
        {!collapsed && <SourceHealthIndicator variant="panel" />}
      </div>
    </>
  );
}