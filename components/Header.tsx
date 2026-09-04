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
    <header className="border-b border-cyber-cyan/10 bg-cyber-dark/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-green animate-pulse shadow-[0_0_8px_rgba(0,255,136,0.8)]" />
            <span className="text-xs font-medium text-cyber-green uppercase tracking-widest">
              Live
            </span>
          </div>
          <div className="h-4 w-px bg-cyber-cyan/20" />
          <h1 className="text-lg font-bold text-white tracking-tight">
            Cyber<span className="text-cyber-cyan">Daily</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-right">
          <span className="text-xs text-gray-500 uppercase tracking-wider hidden sm:inline">
            UTC
          </span>
          <p className="text-sm text-cyber-cyan font-mono glow-text-cyan">
            {lastUpdated.toLocaleTimeString("en-US", { hour12: false })}
          </p>
        </div>
      </div>
    </header>
  );
}
