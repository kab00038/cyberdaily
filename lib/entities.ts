// lib/entities.ts — pure text normalization and explicit entity extraction.
//
// Two jobs, both deterministic and free of I/O so they run on the edge
// runtime and unit-test without fixtures:
//
//   1. Normalize feed text. Feeds emit HTML entities (`M&#038;A`) and
//      syndication furniture ("The post … appeared first on …"). Matching or
//      grouping on raw text means matching on markup.
//   2. Extract CVE identifiers that a source stated explicitly. This is a
//      *reference*, not an assessment: an article naming a CVE is evidence
//      that the article mentions it, and nothing more.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "•",
  copy: "©",
  deg: "°",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  reg: "®",
  rsquo: "’",
  times: "×",
  trade: "™",
  "#39": "'",
  "#8217": "’",
  "#8220": "“",
  "#8221": "”",
};

/**
 * Resolve one numeric entity. `fallback` is returned unchanged for a value
 * that is not a valid scalar; C0/DEL/C1 controls resolve to "" because
 * rendering them produces visible garbage.
 */
function decodeCodePoint(codePoint: number, fallback: string): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return fallback;
  }
  // Lone surrogates are not valid scalar values.
  if (codePoint >= 0xd800 && codePoint <= 0xdfff) return fallback;
  if (
    codePoint <= 0x08 ||
    codePoint === 0x0b ||
    codePoint === 0x0c ||
    (codePoint >= 0x0e && codePoint <= 0x1f) ||
    (codePoint >= 0x7f && codePoint <= 0x9f)
  ) {
    return "";
  }
  return String.fromCodePoint(codePoint);
}

/**
 * Decode HTML entities in feed text: named (`&amp;`), decimal (`&#038;`) and
 * hexadecimal (`&#x27;`) forms.
 *
 * Unrecognized entities are returned verbatim rather than dropped — a visible
 * `&foo;` is a better signal than silent data loss.
 */
export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi,
    (match, body: string) => {
      if (body.charCodeAt(0) === 35 /* # */) {
        const isHex = body[1] === "x" || body[1] === "X";
        const digits = isHex ? body.slice(2) : body.slice(1);
        const codePoint = Number.parseInt(digits, isHex ? 16 : 10);
        return decodeCodePoint(codePoint, match);
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    }
  );
}

/** Collapse every run of whitespace to a single space, then trim. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Display normalization: what a reader should see. Decodes entities and
 * collapses whitespace, but removes no prose — truncating real sentences is
 * worse than leaving a syndication footer in the snippet.
 */
export function normalizeDisplayText(value: string): string {
  return collapseWhitespace(decodeHtmlEntities(value));
}

// Syndication furniture that carries no reporting. Deliberately specific:
// each pattern targets a phrase that is boilerplate in practice, so ordinary
// sentences are left intact.
const BOILERPLATE_PATTERNS: readonly RegExp[] = [
  /\bthe post .{1,160}? appeared first on .{1,80}?\./gi,
  /\bcontinue reading\b.{0,120}/gi,
  /\bview (?:the )?(?:full|original) (?:article|post|story)\b.{0,80}/gi,
  /\bthis (?:article|post|story) (?:was|has been) (?:originally )?(?:published|reported) (?:by|on|at)\b.{0,120}?\./gi,
  /\bsubscribe (?:to|now|today)\b.{0,100}/gi,
  /\bfollow us on\b.{0,80}/gi,
  /\bshare this (?:article|post|story)\b.{0,60}/gi,
  /\b(?:featured )?image credit:?.{0,80}/gi,
  /\s*\[(?:…|\.\.\.)\]\s*/g,
];

/**
 * Remove known feed furniture. Intended for indexing, matching, and grouping —
 * apply after `decodeHtmlEntities` and before storing a semantic hash.
 *
 * Each pattern is replaced with a space (so neighbouring words do not fuse),
 * and the result is whitespace-collapsed so no stray gap survives the removal.
 */
export function stripFeedBoilerplate(value: string): string {
  let out = value;
  for (const pattern of BOILERPLATE_PATTERNS) {
    out = out.replace(pattern, " ");
  }
  return collapseWhitespace(out);
}

// CVE IDs are `CVE-<4-digit year>-<4-7 digit sequence>`. The lookarounds reject
// identifiers embedded in a longer token (`XCVE-…`, `CVE-…-extra`).
const CVE_ID_PATTERN = /(?<![\w-])CVE-(\d{4})-(\d{4,7})(?![\w-])/gi;

/**
 * Canonicalize a single CVE identifier, or `null` when the value is not one.
 * Accepts lowercase and surrounding whitespace; returns the uppercase form.
 */
export function canonicalCveId(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const match = /^(?<![\w-])CVE-(\d{4})-(\d{4,7})(?![\w-])$/i.exec(trimmed);
  if (!match) return null;
  return `CVE-${match[1]}-${match[2]}`.toUpperCase();
}

/**
 * Extract every CVE identifier stated in the supplied text, in first-seen
 * order. Pass several fields (title, snippet) rather than concatenating them
 * so the ordering stays meaningful.
 *
 * A returned ID means the source wrote that identifier. It is not a claim
 * about severity, exploitation, or whether the reader is affected.
 */
export function extractCveIds(
  ...values: ReadonlyArray<string | null | undefined>
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string" || value === "") continue;
    for (const match of decodeHtmlEntities(value).matchAll(CVE_ID_PATTERN)) {
      const id = `CVE-${match[1]}-${match[2]}`.toUpperCase();
      if (seen.has(id)) continue;
      seen.add(id);
      found.push(id);
    }
  }

  return found;
}
