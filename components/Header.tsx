// components/Header.tsx
"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-white/[0.06] bg-[#0B0F0E]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-500 uppercase tracking-widest">
              Live
            </span>
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <h1 className="text-lg font-bold text-white tracking-tight font-display">
            Cyber<span className="text-emerald-500">Daily</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-xs text-gray-500 uppercase tracking-wider hidden sm:inline">
            UTC
          </span>
          <p className="text-sm text-emerald-500 font-mono glow-text-green">
            {lastUpdated.toLocaleTimeString("en-US", { hour12: false })}
          </p>
        </div>
      </div>
    </header>
  );
}
