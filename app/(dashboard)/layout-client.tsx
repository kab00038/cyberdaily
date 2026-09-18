// app/(dashboard)/layout-client.tsx — Client wrapper for the dashboard
// shell. It owns the sidebar collapse state and the mobile drawer state so
// `layout.tsx` can remain a server component.
"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import MobileNavDrawer from "@/components/MobileNavDrawer";

type ShellStyle = CSSProperties & { "--sidebar-width": string };

// Evaluated once when this module is first loaded on the server — for the
// statically-generated routes (/, /news, /threats, /community, /analytics)
// that means once per `next build`, which is what the footer's "Built"
// stamp is meant to show (distinct from AppHeader's page-load clock, per
// the plan's §8 note that the two are "a subtly different thing"). The two
// routes forced onto the edge runtime (/sources, /cve/[id]) re-evaluate
// this per edge invocation rather than per build, since they render
// per-request; `suppressHydrationWarning` below only guards against the
// server/client clock skew on first paint, not that distinction.
const BUILD_TIME = new Date();
const BUILD_TIME_LABEL = `${BUILD_TIME.toISOString().slice(0, 16).replace("T", " ")} UTC`;

export default function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const style: ShellStyle = {
    "--sidebar-width": collapsed ? "5rem" : "15rem",
  };

  return (
    <>
      <div className="app-shell" style={style}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>

        <aside className="app-sidebar">
          <Sidebar
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((prev) => !prev)}
          />
        </aside>

        <main className="app-main" id="main-content" tabIndex={-1}>
          <AppHeader
            mobileOpen={mobileOpen}
            onToggleMobile={() => setMobileOpen((prev) => !prev)}
          />
          <div className="page-content">{children}</div>

          <footer className="app-footer">
            <p className="app-footer-line">
              Data from NVD, CISA KEV, FIRST EPSS, blocklist.de, Hacker News,
              and Reddit — cadence and status on the{" "}
              <Link href="/sources" className="text-link">
                Sources
              </Link>{" "}
              page.
            </p>
            <p className="app-footer-line app-footer-build">
              Built{" "}
              <time dateTime={BUILD_TIME.toISOString()} suppressHydrationWarning>
                {BUILD_TIME_LABEL}
              </time>
            </p>
          </footer>
        </main>
      </div>

      <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}