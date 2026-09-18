// lib/cwe-names.ts — Static lookup for human-readable CWE (Common Weakness
// Enumeration) names, covering the IDs most commonly seen in NVD CVE
// records. This is intentionally a small, hand-maintained table: an ID
// missing here falls back to the bare CWE identifier rather than a guess.
// Never invent a name for an ID that isn't in this map.

export const CWE_NAMES: Record<string, string> = {
  "20": "Improper Input Validation",
  "22": "Path Traversal",
  "74": "Injection",
  "77": "Command Injection",
  "78": "OS Command Injection",
  "79": "Cross-Site Scripting (XSS)",
  "89": "SQL Injection",
  "125": "Out-of-bounds Read",
  "190": "Integer Overflow or Wraparound",
  "345": "Insufficient Verification of Data Authenticity",
  "352": "Cross-Site Request Forgery (CSRF)",
  "400": "Uncontrolled Resource Consumption",
  "416": "Use After Free",
  "434": "Unrestricted Upload of File with Dangerous Type",
  "502": "Deserialization of Untrusted Data",
  "770": "Allocation of Resources Without Limits or Throttling",
  "787": "Out-of-bounds Write",
  "862": "Missing Authorization",
  "863": "Incorrect Authorization",
  "918": "Server-Side Request Forgery (SSRF)",
};

/**
 * Resolve a CWE identifier — either the bare number ("787") or the
 * conventional "CWE-787" form, as returned by NVD — to a human-readable
 * weakness name.
 *
 * Falls back to the original identifier, unchanged, when the numeric ID
 * isn't in the static table above. This never fabricates a name: an
 * unmapped ID is more honest displayed bare than mislabeled.
 */
export function getCweName(cweId: string): string {
  const match = cweId.match(/(\d+)/);
  const numericId = match?.[1];
  if (numericId && numericId in CWE_NAMES) {
    return CWE_NAMES[numericId];
  }
  return cweId;
}
