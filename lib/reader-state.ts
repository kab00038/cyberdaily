// lib/reader-state.ts — browser-local reader state: saved records, review
// dispositions, and private notes.
//
// Two layers, deliberately separated:
//   * Pure functions hold every rule (validation, serialization, whether a
//     revision has superseded a decision) and are unit-tested without a DOM.
//   * Storage accessors tolerate server rendering, absent localStorage, and
//     corrupt or oversized payloads.
//
// Nothing here leaves the browser. A decision is stamped with the record
// revision it was made against, so a later revision can be shown as
// superseding an earlier review rather than silently inheriting it.
//
// A disposition records the reader's own decision. "Addressed" is not a
// CyberDaily verification that remediation happened.

import { asRecord } from "./parse";

export const DISPOSITIONS = [
  "needs_review",
  "investigating",
  "addressed",
  "not_relevant",
] as const;

export type Disposition = (typeof DISPOSITIONS)[number];

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  needs_review: "Needs review",
  investigating: "Investigating",
  addressed: "Addressed",
  not_relevant: "Not relevant",
};

export const READER_STATE_VERSION = 1;
export const READER_STATE_STORAGE_KEY = "cyberdaily.reader-state.v1";

/** Sentinel for a record whose provider supplied no revision timestamp. */
export const UNKNOWN_REVISION = "unknown";

export interface EntityReview {
  entityId: string;
  disposition: Disposition;
  /** The record revision this decision was made against. */
  reviewedRevisionId: string;
  reviewedAt: string;
}

export interface ReaderState {
  version: number;
  /** Canonical entity ID → ISO timestamp saved. */
  saved: Record<string, string>;
  /** Canonical entity ID → disposition. */
  reviews: Record<string, EntityReview>;
  /** Canonical entity ID → private note. Never exported by default. */
  notes: Record<string, string>;
  /** ISO timestamp of the last local write, or "" when nothing is stored. */
  updatedAt: string;
}

export function emptyReaderState(): ReaderState {
  return {
    version: READER_STATE_VERSION,
    saved: {},
    reviews: {},
    notes: {},
    updatedAt: "",
  };
}

export function isDisposition(value: unknown): value is Disposition {
  return (
    typeof value === "string" &&
    (DISPOSITIONS as readonly string[]).includes(value)
  );
}

function readStringMap(value: unknown): Record<string, string> {
  const record = asRecord(value);
  if (record === null) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return out;
}

function readReviews(value: unknown): Record<string, EntityReview> {
  const record = asRecord(value);
  if (record === null) return {};
  const out: Record<string, EntityReview> = {};
  for (const [key, entry] of Object.entries(record)) {
    const review = asRecord(entry);
    if (review === null) continue;
    if (!isDisposition(review.disposition)) continue;
    if (typeof review.reviewedRevisionId !== "string") continue;
    if (typeof review.reviewedAt !== "string") continue;
    out[key] = {
      entityId: typeof review.entityId === "string" ? review.entityId : key,
      disposition: review.disposition,
      reviewedRevisionId: review.reviewedRevisionId,
      reviewedAt: review.reviewedAt,
    };
  }
  return out;
}

/**
 * Validate untrusted input (an imported file, or whatever is in storage) into
 * a usable state.
 *
 * Returns `null` only when the payload is not a reader-state document at all
 * — wrong shape, or a version this build does not understand. Within a
 * recognized document, individual malformed entries are dropped rather than
 * failing the whole import, so one bad row cannot cost the reader the rest.
 */
export function parseReaderState(input: unknown): ReaderState | null {
  const record = asRecord(input);
  if (record === null) return null;
  if (record.version !== READER_STATE_VERSION) return null;

  return {
    version: READER_STATE_VERSION,
    saved: readStringMap(record.saved),
    reviews: readReviews(record.reviews),
    notes: readStringMap(record.notes),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : "",
  };
}

export interface SerializeOptions {
  /**
   * Private notes are excluded unless explicitly requested. Default exports
   * are shareable, so they carry no private annotations.
   */
  includeNotes?: boolean;
}

/** Serialize state to a JSON document. Pretty-printed so a diff is reviewable. */
export function serializeReaderState(
  state: ReaderState,
  options: SerializeOptions = {}
): string {
  return JSON.stringify(
    {
      ...state,
      notes: options.includeNotes === true ? state.notes : {},
    },
    null,
    2
  );
}

/**
 * Whether a recorded decision predates the record's current revision.
 *
 * Unknown on either side is never reported as outdated — an unestablished
 * revision cannot prove that anything changed.
 */
export function isReviewOutdated(
  review: EntityReview,
  currentRevisionId: string | null
): boolean {
  if (currentRevisionId === null) return false;
  if (currentRevisionId === UNKNOWN_REVISION) return false;
  if (review.reviewedRevisionId === UNKNOWN_REVISION) return false;
  return review.reviewedRevisionId !== currentRevisionId;
}

export function setSaved(
  state: ReaderState,
  entityId: string,
  saved: boolean,
  at: string
): ReaderState {
  const next = { ...state.saved };
  if (saved) next[entityId] = at;
  else delete next[entityId];
  return { ...state, saved: next, updatedAt: at };
}

export function setDisposition(
  state: ReaderState,
  entityId: string,
  disposition: Disposition,
  revisionId: string,
  at: string
): ReaderState {
  return {
    ...state,
    reviews: {
      ...state.reviews,
      [entityId]: {
        entityId,
        disposition,
        reviewedRevisionId: revisionId,
        reviewedAt: at,
      },
    },
    updatedAt: at,
  };
}

export function clearDisposition(
  state: ReaderState,
  entityId: string,
  at: string
): ReaderState {
  const reviews = { ...state.reviews };
  delete reviews[entityId];
  return { ...state, reviews, updatedAt: at };
}

export function setNote(
  state: ReaderState,
  entityId: string,
  note: string,
  at: string
): ReaderState {
  const notes = { ...state.notes };
  const trimmed = note.trim();
  if (trimmed === "") delete notes[entityId];
  else notes[entityId] = trimmed;
  return { ...state, notes, updatedAt: at };
}

export function loadReaderState(): ReaderState {
  if (typeof window === "undefined") return emptyReaderState();
  try {
    const raw = window.localStorage.getItem(READER_STATE_STORAGE_KEY);
    if (raw === null) return emptyReaderState();
    return parseReaderState(JSON.parse(raw)) ?? emptyReaderState();
  } catch {
    // Corrupt JSON or blocked storage — start clean rather than crash.
    return emptyReaderState();
  }
}

/**
 * Persist state, including private notes (this is the reader's own browser).
 * Returns false when the write failed, e.g. storage disabled or full.
 */
export function saveReaderState(state: ReaderState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      READER_STATE_STORAGE_KEY,
      serializeReaderState(state, { includeNotes: true })
    );
    return true;
  } catch {
    return false;
  }
}

export function clearStoredReaderState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(READER_STATE_STORAGE_KEY);
  } catch {
    // Storage unavailable — there is nothing to clear.
  }
}
