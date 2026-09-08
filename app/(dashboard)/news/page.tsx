// app/(dashboard)/news/page.tsx
import type { Metadata } from "next";
import NewsPageClient from "./NewsPageClient";

export const metadata: Metadata = { title: "News — CyberDaily" };

export default function NewsPage() {
  return <NewsPageClient />;
}