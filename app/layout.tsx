import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

// next/font/google self-hosts these at build time (no runtime Google Fonts
// request, no render-blocking @import, automatic `font-display: swap`).
// Each `variable` is wired into app/globals.css and tailwind.config.ts so
// every existing selector ('.font-mono', '.page-title', 'body', etc.) keeps
// resolving to the same face it did before (F19).
//
// Weights loaded are audited against actual usage, not shipped blind:
//   - Space Grotesk (display): 500 (.page-title, .section-title), 600
//     (.brand-wordmark). No component uses 400 or 700 on this face.
//   - DM Sans (body): 400 (body default / `font-normal`), 500
//     (`font-medium`, widely used), 600 (`font-semibold`, widely used).
//     No component uses 700 (`font-bold`) on this face.
//   - JetBrains Mono (data/metadata): 400 (.cve-ref, .metric-scope,
//     table cve-id, .distribution-value), 500 (.eyebrow, .metric-number),
//     600 (.brand-mark, and `font-mono font-semibold` combinations e.g.
//     ThreatMap country count, CveDetails headings). No component uses 700.
// That drops weight 700 across all three families, and weight 400 for
// Space Grotesk — down from 12 font files (4 weights x 3 families) to 8.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

const siteUrl = "https://cyberdaily.pages.dev";
const siteTitle = "CyberDaily — Cybersecurity news and vulnerability intelligence";
const siteDescription =
  "Daily cybersecurity news, vulnerabilities, and threat intelligence.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · CyberDaily",
  },
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: "CyberDaily",
    type: "website",
    locale: "en_US",
    // og:image tag itself comes from the static app/opengraph-image.png
    // file convention below — generated once at build time, not per request.
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    // twitter:image comes from the static app/twitter-image.png convention.
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1110", // matches --cd-canvas in app/globals.css
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      data-webtui-theme="dark"
    >
      <body className="min-h-screen bg-ui-canvas">{children}</body>
    </html>
  );
}
