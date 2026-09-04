import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberDaily - Cybersecurity News Dashboard",
  description:
    "Daily cybersecurity news, threat forecasts, and real-time threat intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cyber-dark">{children}</body>
    </html>
  );
}
