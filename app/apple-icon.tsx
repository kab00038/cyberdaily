// app/apple-icon.tsx — apple-touch-icon (F16), the same brand-mark motif as
// app/icon.tsx rendered as a 180x180 PNG for iOS home-screen bookmarks. See
// app/icon.tsx for why this is a function-based edge route rather than a
// plain app/apple-icon.png file: it serves fixed, pre-rendered bytes with no
// per-request image generation.
import { APPLE_ICON_PNG_BASE64, base64ToBytes } from "./_brand/og-assets";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 180, height: 180 };

export default function AppleIcon() {
  return new Response(base64ToBytes(APPLE_ICON_PNG_BASE64), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}
