// app/(dashboard)/news/page.tsx
import type { Metadata } from "next";
import NewsSection from "@/components/sections/NewsSection";

export const metadata: Metadata = { title: "News — CyberDaily" };

export default function NewsPage() {
  return <NewsSection />;
}