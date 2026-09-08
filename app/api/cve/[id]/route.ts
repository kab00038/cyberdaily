// app/api/cve/[id]/route.ts
// Per-CVE lookup for the detail page. Combines the KEV catalog, the locally
// loaded NVD snapshot, a direct NVD fallback, and EPSS into one payload so
// the client never has to fan out multiple requests.
//
// cveLookupStatus:
//   "found"             — CVE present in the locally loaded NVD snapshot
//   "found-via-direct"  — CVE absent locally, resolved via direct NVD lookup
//   "not-found-locally" — not in the snapshot and no NVD record either
//   "error"             — upstream lookup failed unexpectedly
import { NextResponse } from "next/server";
import { fetchCVELatest, fetchCVEDirect, type CVEItem } from "@/lib/nvd";
import { fetchKEVCatalog, type KEVItem } from "@/lib/abuse-ch";
import { fetchEPSSScores, type EPSSScore } from "@/lib/epss";

export const runtime = "edge";

export type CVELookupStatus =
  | "found"
  | "found-via-direct"
  | "not-found-locally"
  | "error";

interface CVELookupPayload {
  cve: CVEItem | null;
  kev: KEVItem | null;
  cveLookupStatus: CVELookupStatus;
  epss: EPSSScore | null;
  fetchedAt: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  let id = rawId.trim().toUpperCase();
  try {
    id = decodeURIComponent(id).trim().toUpperCase();
  } catch {
    // Malformed percent-encoding — fall back to the raw value.
  }
  const fetchedAt = new Date().toISOString();

  let kev: KEVItem | null = null;

  try {
    const [catalog, latest] = await Promise.allSettled([
      fetchKEVCatalog(),
      fetchCVELatest(),
    ]);

    const fullCatalog =
      catalog.status === "fulfilled" ? catalog.value : [];
    kev = fullCatalog.find((entry) => entry.cveID === id) ?? null;

    const snapshotItems =
      latest.status === "fulfilled" ? latest.value.items : [];
    let cve = snapshotItems.find((item) => item.id === id) ?? null;
    let cveLookupStatus: CVELookupStatus = "not-found-locally";

    if (cve) {
      cveLookupStatus = "found";
    } else {
      const direct = await fetchCVEDirect(id);
      if (direct) {
        cve = direct;
        cveLookupStatus = "found-via-direct";
      }
    }

    let epss: EPSSScore | null = null;
    if (cve) {
      const scores = await fetchEPSSScores([id]);
      epss = scores.get(id) ?? null;
    }

    return NextResponse.json(
      { cve, kev, cveLookupStatus, epss, fetchedAt } satisfies CVELookupPayload,
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("CVE lookup API error:", error);
    return NextResponse.json(
      {
        cve: null,
        kev,
        cveLookupStatus: "error",
        epss: null,
        fetchedAt,
      } satisfies CVELookupPayload,
      { status: 500 }
    );
  }
}