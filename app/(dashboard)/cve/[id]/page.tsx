// app/(dashboard)/cve/[id]/page.tsx — dedicated CVE detail page.
import type { Metadata } from "next";
import CveDetailClient from "./CveDetailClient";

// Required by Cloudflare Pages / @cloudflare/next-on-pages: all
// non-static routes must opt into the Edge runtime.
export const runtime = "edge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // Malformed percent-encoding — fall back to the raw value.
  }
  return { title: `${decoded} — CyberDaily` };
}

export default async function CveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // Malformed percent-encoding — fall back to the raw value.
  }
  return <CveDetailClient id={decoded} />;
}