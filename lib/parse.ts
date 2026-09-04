// lib/parse.ts — narrow unvalidated JSON into typed shapes
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** String or localized-text object ({ "#text": "..." }) → string */
export function asText(value: unknown): string {
  if (typeof value === "string") return value;
  const text = asRecord(value)?.["#text"];
  return asString(text);
}
