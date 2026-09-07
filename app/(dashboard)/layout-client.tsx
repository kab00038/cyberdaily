// app/(dashboard)/layout-client.tsx — Client wrapper for the dashboard
// shell. It owns the sidebar collapse state and the mobile drawer state so
// `layout.tsx` can remain a server component.
"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";
import MobileNavDrawer from "@/components/MobileNavDrawer";

type ShellStyle = CSSProperties & { "--sidebar-width": string };

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
        </main>
      </div>

      <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}