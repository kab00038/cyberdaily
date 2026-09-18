// app/opengraph-image.tsx — static Open Graph image (F16): masthead, brand
// mark, eyebrow, headline, and the data-source footer, at the standard
// 1200x630 card size. Kept static and cacheable per the task: the PNG bytes
// are produced once, ahead of time (not with next/og's ImageResponse at
// request time), and this route only decodes and serves them. It has to be
// a function-based route rather than a plain app/opengraph-image.png file
// for the same @cloudflare/next-on-pages edge-runtime requirement described
// in app/icon.tsx — there is no per-request rendering here, only byte
// serving with a long-lived Cache-Control header.
import { OG_IMAGE_PNG_BASE64, base64ToBytes } from "./_brand/og-assets";

export const runtime = "edge";
export const alt =
  "CyberDaily — daily cybersecurity news and vulnerability intelligence, sourced from NVD, CISA KEV, FIRST EPSS, blocklist.de, Hacker News, and Reddit.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new Response(base64ToBytes(OG_IMAGE_PNG_BASE64), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}
