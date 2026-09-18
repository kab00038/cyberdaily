// app/twitter-image.tsx — Twitter/X card image (F16). Same static, pre-baked
// artwork as app/opengraph-image.tsx (see that file for why this is a
// function-based edge route rather than a plain image file, and why it does
// no per-request rendering).
import { OG_IMAGE_PNG_BASE64, base64ToBytes } from "./_brand/og-assets";

export const runtime = "edge";
export const alt =
  "CyberDaily — daily cybersecurity news and vulnerability intelligence, sourced from NVD, CISA KEV, FIRST EPSS, blocklist.de, Hacker News, and Reddit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new Response(base64ToBytes(OG_IMAGE_PNG_BASE64), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}
