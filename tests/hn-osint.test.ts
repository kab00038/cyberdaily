// tests/hn-osint.test.ts
// Regression tests for the community feeds: the HN date-bounded query and
// the Reddit feed's real-time-first sorting. No network access.

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHackerNewsStories } from "@/lib/hn";
import { fetchOsintFeed } from "@/lib/osint";

afterEach(() => {
  vi.unstubAllGlobals();
});

function redditAtom(entries: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">${entries}</feed>`;
}

function redditEntry(
  title: string,
  sub: string,
  published: string | undefined,
  content: string
): string {
  const dateTag = published ? `<published>${published}</published>` : "";
  const slug = title.toLowerCase().replace(/\s+/g, "-");
  return (
    `<entry><title>${title}</title>` +
    `<link href="https://www.reddit.com/r/${sub}/comments/${slug}"/>` +
    `<id>https://www.reddit.com/r/${sub}/comments/${slug}</id>` +
    `${dateTag}<content type="html">${content}</content></entry>`
  );
}

describe("fetchHackerNewsStories", () => {
  it("builds a date-bounded numericFilters query in latest mode", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        capturedUrl = String(input);
        return {
          ok: true,
          json: async () => ({
            hits: [
              {
                title: "Story A",
                url: "https://example.com/a",
                points: 42,
                num_comments: 7,
                created_at: "2026-09-07T10:00:00Z",
                objectID: "1",
              },
              {
                title: "Story B",
                url: undefined,
                points: 3,
                num_comments: 0,
                created_at: "not-a-date",
                objectID: "2",
              },
            ],
          }),
        } as unknown as Response;
      })
    );

    const stories = await fetchHackerNewsStories("latest", { days: 7 });

    expect(capturedUrl).toContain("https://hn.algolia.com/api/v1/search");
    // URLSearchParams percent-encodes ">=" in the filter value.
    const match = capturedUrl.match(/numericFilters=created_at_i%3E%3D(\d+)/);
    expect(match).not.toBeNull();
    const since = Number(match![1]);
    const expected = Math.floor(Date.now() / 1000) - 7 * 86_400;
    expect(since).toBeGreaterThanOrEqual(expected - 5);
    expect(since).toBeLessThanOrEqual(expected + 5);

    // Valid created_at maps to an ISO string; invalid stays null.
    expect(stories[0].publishedAt).toBe(
      new Date("2026-09-07T10:00:00Z").toISOString()
    );
    expect(stories[1].publishedAt).toBeNull();
    // No external URL -> HN item URL is used.
    expect(stories[1].url).toBe("https://news.ycombinator.com/item?id=2");
  });

  it("does not add numericFilters in top mode", async () => {
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        capturedUrl = String(input);
        return {
          ok: true,
          json: async () => ({ hits: [] }),
        } as unknown as Response;
      })
    );

    await fetchHackerNewsStories("top", { days: 7 });
    expect(capturedUrl).not.toContain("numericFilters");
  });
});

describe("fetchOsintFeed", () => {
  it("sorts by real publication time, null timestamps last", async () => {
    const netsecXml = redditAtom(
      redditEntry(
        "Newest post",
        "netsec",
        "2026-09-07T12:00:00Z",
        "Post content with 40 points and 5 comments."
      )
    );
    const cyberXml = redditAtom(
      redditEntry(
        "Older post",
        "cybersecurity",
        "2026-09-07T10:00:00Z",
        "Post content with 12 points and 3 comments."
      ) +
        redditEntry(
          "Dated post",
          "cybersecurity",
          undefined,
          "Post content with 7 points and 1 comment."
        )
    );
    const emptyXml = redditAtom("");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
        const url = String(input);
        const body = url.includes("/r/netsec/")
          ? netsecXml
          : url.includes("/r/cybersecurity/")
            ? cyberXml
            : emptyXml;
        return { ok: true, text: async () => body } as unknown as Response;
      })
    );

    const posts = await fetchOsintFeed(30);

    // Newest first, dated posts ahead of the undated one, engagement parsed.
    expect(posts.map((p) => p.title)).toEqual([
      "Newest post",
      "Older post",
      "Dated post",
    ]);
    expect(posts[0].publishedAt).toBe(
      new Date("2026-09-07T12:00:00Z").toISOString()
    );
    expect(posts[0].score).toBe(40);
    expect(posts[0].comments).toBe(5);
    expect(posts[2].publishedAt).toBeNull();

    // The limit is applied after sorting.
    const limited = await fetchOsintFeed(2);
    expect(limited.map((p) => p.title)).toEqual(["Newest post", "Older post"]);
  });
});