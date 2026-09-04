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
    <header className="border-b border-cyber-navy bg-cyber-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyber-green/20 rounded-lg flex items-center justify-center">
            <span className="text-cyber-green text-xl">🛡️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">CyberDaily</h1>
            <p className="text-xs text-gray-400">Cybersecurity Intelligence Dashboard</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Last updated</p>
          <p className="text-sm text-cyber-green font-mono">
            {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </header>
  );
}
