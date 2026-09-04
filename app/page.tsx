import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import ThreatMap from "@/components/ThreatMap";
import NewsFeed from "@/components/NewsFeed";
import ThreatForecast from "@/components/ThreatForecast";
import HackerNewsFeed from "@/components/HackerNewsFeed";

export default function Home() {
  return (
    <div className="min-h-screen bg-cyber-dark">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <StatsBar />

        {/* Threat Map - Full Width */}
        <div className="mb-6">
          <ThreatMap />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* News Feed - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-cyber-navy rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-cyber-green">📰</span>
                  Cybersecurity News
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
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-gray-500">
          <p>CyberDaily — Cybersecurity Intelligence Dashboard</p>
          <p className="mt-1">
            Data sources: RSS Feeds • CISA KEV • NVD CVE • abuse.ch • Hacker News
          </p>
        </div>
      </footer>
    </div>
  );
}
