import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CyberDaily — Cybersecurity news and vulnerability intelligence",
  description:
    "Daily cybersecurity news, vulnerabilities, and threat intelligence.",
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
