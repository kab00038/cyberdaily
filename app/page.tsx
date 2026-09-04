import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import ThreatMap from "@/components/ThreatMap";
import NewsFeed from "@/components/NewsFeed";
import ThreatForecast from "@/components/ThreatForecast";
import HackerNewsFeed from "@/components/HackerNewsFeed";

export default function Home() {
  return (
    <div className="min-h-screen bg-cyber-dark font-sans">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsBar />

        {/* Threat Map - Hero, ~45% viewport */}
        <div className="mb-8 h-[45vh] min-h-[380px]">
          <ThreatMap />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News Feed - 2 columns */}
          <div className="lg:col-span-2">
            <div className="panel rounded-lg overflow-hidden">
              <div className="panel-header p-4">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-widest">
                  <svg className="w-4 h-4 text-cyber-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  Cybersecurity Intelligence Feed
                </h2>
              </div>
              <div className="p-4">
                <NewsFeed />
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            <ThreatForecast />
            <HackerNewsFeed />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-cyber-cyan/10 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-gray-600 font-mono">
          <p className="text-gray-500">CyberDaily — Cybersecurity Intelligence Dashboard</p>
          <p className="mt-1">
            Data sources: RSS Feeds • CISA KEV • NVD CVE • abuse.ch • Hacker News
          </p>
        </div>
      </footer>
    </div>
  );
}
