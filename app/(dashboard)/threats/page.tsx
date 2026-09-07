// app/(dashboard)/threats/page.tsx
import type { Metadata } from "next";
import ThreatsSection from "@/components/sections/ThreatsSection";

export const metadata: Metadata = { title: "Vulnerabilities — CyberDaily" };

export default function ThreatsPage() {
  return <ThreatsSection />;
}