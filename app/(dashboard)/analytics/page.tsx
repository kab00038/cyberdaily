// app/(dashboard)/analytics/page.tsx
import type { Metadata } from "next";
import AnalyticsSection from "@/components/sections/AnalyticsSection";

export const metadata: Metadata = { title: "Analytics — CyberDaily" };

export default function AnalyticsPage() {
  return <AnalyticsSection />;
}