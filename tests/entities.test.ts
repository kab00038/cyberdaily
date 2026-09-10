// tests/entities.test.ts
// Regression tests for lib/entities.ts — feed normalization and CVE
// extraction. Pure functions, no fixtures required.

import { describe, expect, it } from "vitest";
import {
  canonicalCveId,
  collapseWhitespace,
  decodeHtmlEntities,
  extractCveIds,
  normalizeDisplayText,
  stripFeedBoilerplate,
} from "@/lib/entities";

describe("decodeHtmlEntities", () => {
  it("decodes the escaped ampersand that reaches real headlines", () => {
    expect(decodeHtmlEntities("Broadcom&#038;Symantec M&#038;A")).toBe(
      "Broadcom&Symantec M&A"
    );
  });

  it("decodes named, decimal, and hexadecimal forms", () => {
    expect(decodeHtmlEntities("&amp; &quot;x&quot;")).toBe('& "x"');
    expect(decodeHtmlEntities("caf&#233;")).toBe("café");
    expect(decodeHtmlEntities("caf&#xE9;")).toBe("café");
  });

  it("decodes a numeric entity to a character that is itself not markup", () => {
    // `&lt;script&gt;` must decode to literal text, never become live markup.
    expect(decodeHtmlEntities("&lt;script&gt;")).toBe("<script>");
  });

  it("leaves an unrecognized entity verbatim rather than dropping it", () => {
    expect(decodeHtmlEntities("&bogus; stays")).toBe("&bogus; stays");
  });

  it("drops control characters but keeps valid scalars", () => {
    expect(decodeHtmlEntities("a&#0;b")).toBe("ab");
    // A lone surrogate is not encodable and is returned as written.
    expect(decodeHtmlEntities("&#xD800;")).toBe("&#xD800;");
  });
});

describe("collapseWhitespace", () => {
  it("collapses runs of whitespace and trims", () => {
    expect(collapseWhitespace("  a \n\n b\t c  ")).toBe("a b c");
  });
});

describe("stripFeedBoilerplate", () => {
  it("removes the WordPress syndication footer", () => {
    const input =
      "Ransomware crew hits a hospital. The post Ransomware crew hits a hospital appeared first on BleepingComputer.";
    expect(stripFeedBoilerplate(input)).not.toContain("appeared first on");
  });

  it("removes a trailing continue-reading marker", () => {
    expect(stripFeedBoilerplate("Patch released. Continue reading")).toBe(
      "Patch released."
    );
  });

  it("keeps ordinary prose that merely contains reporting words", () => {
    const input =
      "The company said the report appeared after an internal review.";
    expect(collapseWhitespace(stripFeedBoilerplate(input))).toBe(input);
  });
});

describe("normalizeDisplayText", () => {
  it("decodes entities and collapses whitespace without truncating prose", () => {
    expect(normalizeDisplayText("  M&#038;A   review \n")).toBe("M&A review");
  });
});

describe("canonicalCveId", () => {
  it("accepts a valid identifier in any case and canonicalizes it", () => {
    expect(canonicalCveId("cve-2026-12345")).toBe("CVE-2026-12345");
    expect(canonicalCveId("  CVE-2021-44228  ")).toBe("CVE-2021-44228");
  });

  it("rejects values that are not CVE identifiers", () => {
    expect(canonicalCveId("")).toBeNull();
    expect(canonicalCveId("CVE-2026-123")).toBeNull(); // too short
    expect(canonicalCveId("CVE-26-12345")).toBeNull(); // 2-digit year
    expect(canonicalCveId("GHSA-xxxx-yyyy-zzzz")).toBeNull();
  });
});

describe("extractCveIds", () => {
  it("extracts identifiers in first-seen order", () => {
    expect(
      extractCveIds("Fixes CVE-2026-1111 and CVE-2026-2222 in the same release.")
    ).toEqual(["CVE-2026-1111", "CVE-2026-2222"]);
  });

  it("deduplicates across the supplied fields", () => {
    expect(extractCveIds("CVE-2026-1111", "See CVE-2026-1111 for details.")).toEqual(
      ["CVE-2026-1111"]
    );
  });

  it("normalizes case and decodes entities before matching", () => {
    expect(extractCveIds("cve-2026-3333")).toEqual(["CVE-2026-3333"]);
    expect(extractCveIds("fixed in CVE&#045;2026&#045;4444")).toEqual([
      "CVE-2026-4444",
    ]);
  });

  it("does not match an identifier embedded in a longer token", () => {
    expect(extractCveIds("XCVE-2026-1111")).toEqual([]);
    expect(extractCveIds("CVE-2026-1111-patch")).toEqual([]);
  });

  it("ignores absent fields and returns none when nothing matches", () => {
    expect(extractCveIds(null, undefined, "no identifiers here")).toEqual([]);
  });

  it("accepts a 7-digit sequence and rejects a 3-digit one", () => {
    expect(extractCveIds("CVE-2026-1234567")).toEqual(["CVE-2026-1234567"]);
    expect(extractCveIds("CVE-2026-123")).toEqual([]);
  });
});
