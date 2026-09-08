// tests/rss.test.ts
// Regression tests for lib/rss.ts feed parsing. Everything runs against
// canned XML fixtures with a mocked global fetch — no network access.

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRSSFeedsWithStatus } from "@/lib/rss";

function rssDoc(items: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    ${items}
  </channel>
</rss>`;
}

function rssItem(title: string, link: string, body: string): string {
  return `<item><title>${title}</title><link>${link}</link>${body}</item>`;
}

// Main RSS fixture: one dated item, two items without any date, one item with
// an unparseable date, and a long HTML description that must be stripped and
// clamped to the 200-char snippet limit.
const longText = "A".repeat(250);
const mainXml = rssDoc(
  rssItem(
    "Valid date item",
    "https://example.com/valid",
    `<description><![CDATA[<p><b>${longText}</b></p>]]></description>` +
      `<pubDate>Mon, 07 Sep 2026 10:00:00 GMT</pubDate>`
  ) +
    rssItem(
      "First no-date item",
      "https://example.com/first",
      "<description>Short first.</description>"
    ) +
    rssItem(
      "Second no-date item",
      "https://example.com/second",
      "<description>Short second.</description>"
    ) +
    rssItem(
      "Invalid date item",
      "https://example.com/invalid",
      "<description>Short invalid.</description><pubDate>not a real date</pubDate>"
    )
);

// Atom fixture: several <link> elements; the alternate link must be picked.
const atomXml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom</title>
  <entry>
    <title>Atom alternate link item</title>
    <link href="https://example.com/self" rel="self"/>
    <link href="https://example.com/article" rel="alternate"/>
    <link href="https://example.com/unrelated"/>
    <summary>A short summary.</summary>
    <published>2026-09-07T08:00:00Z</published>
  </entry>
</feed>`;

// Fixture where every item lacks a publication date — used to verify the
// sort is stable and never synthesizes a "now" timestamp.
const noDateXml = rssDoc(
  rssItem("Null A", "https://example.com/a", "<description>a</description>") +
    rssItem("Null B", "https://example.com/b", "<description>b</description>") +
    rssItem("Null C", "https://example.com/c", "<description>c</description>")
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRSSFeedsWithStatus (mocked fetch)", () => {
  it("parses RSS and Atom feeds from canned XML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        const body = url.includes("darkreading.com")
          ? atomXml
          : url.includes("bleepingcomputer.com")
            ? mainXml
            : noDateXml;
        return { ok: true, text: async () => body } as unknown as Response;
      })
    );

    const { items, feeds } = await fetchRSSFeedsWithStatus();

    expect(feeds).toHaveLength(6);
    expect(feeds.every((f) => f.ok)).toBe(true);
    expect(feeds.find((f) => f.name === "BleepingComputer")?.count).toBe(4);
    expect(feeds.find((f) => f.name === "Dark Reading")?.count).toBe(1);

    // Dated item sorts first, and its pubDate is the parsed value, not a
    // fetch-time "now".
    const bleeping = items.filter((i) => i.source === "BleepingComputer");
    expect(bleeping.map((i) => i.title)).toEqual([
      "Valid date item",
      "First no-date item",
      "Second no-date item",
      "Invalid date item",
    ]);
    const expectedIso = new Date(
      Date.parse("Mon, 07 Sep 2026 10:00:00 GMT")
    ).toISOString();
    expect(bleeping[0].pubDate).toBe(expectedIso);
    expect(Math.abs(Date.parse(bleeping[0].pubDate!) - Date.now())).toBeGreaterThan(
      60_000
    );

    // Missing and invalid pubDates become null — never synthesized.
    expect(bleeping[1].pubDate).toBeNull();
    expect(bleeping[2].pubDate).toBeNull();
    expect(bleeping[3].pubDate).toBeNull();
  });

  it("strips HTML and clamps snippets to maxLength", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        const body = url.includes("bleepingcomputer.com")
          ? mainXml
          : noDateXml;
        return { ok: true, text: async () => body } as unknown as Response;
      })
    );

    const { items } = await fetchRSSFeedsWithStatus();
    const valid = items.find((i) => i.title === "Valid date item");

    expect(valid?.snippet).toHaveLength(200 + 3); // clamped + "..."
    expect(valid?.snippet.endsWith("...")).toBe(true);
    expect(valid?.snippet.includes("<")).toBe(false);
  });

  it("keeps all-null pubDate items in input order (stable sort)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        return { ok: true, text: async () => noDateXml } as unknown as Response;
      })
    );

    const { items } = await fetchRSSFeedsWithStatus();
    const hackerNewsItems = items.filter((i) => i.source === "The Hacker News");

    expect(hackerNewsItems.map((i) => i.title)).toEqual([
      "Null A",
      "Null B",
      "Null C",
    ]);
    expect(hackerNewsItems.every((i) => i.pubDate === null)).toBe(true);
  });

  it("picks the alternate <link> from Atom entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        const body = url.includes("darkreading.com")
          ? atomXml
          : noDateXml;
        return { ok: true, text: async () => body } as unknown as Response;
      })
    );

    const { items } = await fetchRSSFeedsWithStatus();
    const atomItem = items.find((i) => i.title === "Atom alternate link item");

    expect(atomItem?.link).toBe("https://example.com/article");
    expect(atomItem?.source).toBe("Dark Reading");
  });
});