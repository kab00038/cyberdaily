"use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardSection from "@/components/sections/DashboardSection";
import NewsSection from "@/components/sections/NewsSection";
import ThreatsSection from "@/components/sections/ThreatsSection";
import OsintSection from "@/components/sections/OsintSection";
import AnalyticsSection from "@/components/sections/AnalyticsSection";

export default function Home() {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const sections: Record<string, React.ReactNode> = useMemo(
    () => ({
      dashboard: <DashboardSection />,
      news: <NewsSection />,
      threats: <ThreatsSection />,
      osint: <OsintSection />,
      analytics: <AnalyticsSection />,
    }),
    []
  );

  const pageTitle = useMemo(() => {
    if (activeSection === "osint") return "OSINT";
    if (activeSection === "threats") return "Threat Intel";
    return activeSection;
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-cyber-dark font-sans">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <main
        className={`min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? "md:ml-16" : "md:ml-56"
        } ml-0`}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-cyber-dark/80 backdrop-blur-md border-b border-gray-800/50">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle navigation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white capitalize">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 font-mono">
                {now.toLocaleTimeString("en-US", { timeZone: "UTC", hour12: false })} UTC
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6">{sections[activeSection]}</div>
      </main>
    </div>
  );
}
