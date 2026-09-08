import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // RSS thumbnails are remote user-content we don't control (e.g.
    // bleepingcomputer.com, feeds.feedburner.com, krebsonsecurity.com,
    // darkreading.com, securityweek.com, therecord.media) — serve them
    // as-is instead of running them through the image optimizer.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
