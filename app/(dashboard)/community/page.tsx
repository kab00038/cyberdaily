// app/(dashboard)/community/page.tsx
import type { Metadata } from "next";
import OsintSection from "@/components/sections/OsintSection";

export const metadata: Metadata = { title: "Community — CyberDaily" };

export default function CommunityPage() {
  return <OsintSection />;
}