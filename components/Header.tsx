// components/Header.tsx
"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-[rgba(232,83,30,0.10)] bg-[#0F0A08]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#2EAA7A] animate-pulse shadow-[0_0_8px_rgba(46,170,122,0.8)]" />
            <span className="text-xs font-medium text-[#2EAA7A] uppercase tracking-widest">
              Live
            </span>
          </div>
          <div className="h-4 w-px bg-[#E8531E]/20" />
          <h1 className="text-lg font-bold text-[#F0E8E0] tracking-tight font-display">
            Cyber<span className="text-[#E8531E]">Daily</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-xs text-[#8A7A6A] uppercase tracking-wider hidden sm:inline">
            UTC
          </span>
          <p className="text-sm text-[#E8531E] font-mono glow-text-orange">
            {lastUpdated.toLocaleTimeString("en-US", { hour12: false })}
          </p>
        </div>
      </div>
    </header>
  );
}
