// app/icon.tsx — favicon (F16), from the existing `.brand-mark` "cd" monogram
// in app/globals.css (two accent rules with the wordmark's initials between
// them). This has to be a function-based route rather than a plain
// app/icon.svg file: @cloudflare/next-on-pages requires every route it
// deploys, including the Route Handler Next auto-generates for a static
// icon file, to declare the edge runtime explicitly. The SVG markup below is
// fixed text decided ahead of time — there is no per-request drawing, only
// serving the same bytes with a long-lived Cache-Control header.
import { ICON_SVG } from "./_brand/og-assets";

export const runtime = "edge";
export const contentType = "image/svg+xml";
export const size = { width: 32, height: 32 };

export default function Icon() {
  return new Response(ICON_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}
