// tests/reader-state.test.ts
// Regression tests for lib/reader-state.ts. The pure rules are exercised
// directly; storage accessors run against a minimal in-memory localStorage
// stub, so no browser or jsdom is required.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DISPOSITIONS,
  READER_STATE_STORAGE_KEY,
  UNKNOWN_REVISION,
  clearDisposition,
  clearStoredReaderState,
  emptyReaderState,
  isDisposition,
  isReviewOutdated,
  loadReaderState,
  parseReaderState,
  saveReaderState,
  serializeReaderState,
  setDisposition,
  setNote,
  setSaved,
} from "@/lib/reader-state";

const AT = "2026-09-10T12:00:00.000Z";
const LATER = "2026-09-11T09:30:00.000Z";
const CVE = "CVE-2026-19490";
const REV = "2026-09-09T00:00:00.000Z";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get size(): number {
    return this.store.size;
  }
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: new MemoryStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isDisposition", () => {
  it("accepts every declared disposition", () => {
    for (const value of DISPOSITIONS) expect(isDisposition(value)).toBe(true);
  });

  it("rejects unknown values and non-strings", () => {
    expect(isDisposition("resolved")).toBe(false);
    expect(isDisposition(null)).toBe(false);
  });
});

describe("emptyReaderState", () => {
  it("starts with no records and no write timestamp", () => {
    expect(emptyReaderState()).toEqual({
      version: 1,
      saved: {},
      reviews: {},
      notes: {},
      updatedAt: "",
    });
  });
});

describe("setSaved", () => {
  it("saves then removes a record without mutating the input", () => {
    const base = emptyReaderState();
    const saved = setSaved(base, CVE, true, AT);
    expect(saved.saved[CVE]).toBe(AT);
    expect(base.saved[CVE]).toBeUndefined();

    expect(setSaved(saved, CVE, false, LATER).saved[CVE]).toBeUndefined();
  });
});

describe("setDisposition / clearDisposition", () => {
  it("records the revision the decision was made against", () => {
    const next = setDisposition(emptyReaderState(), CVE, "investigating", REV, AT);
    expect(next.reviews[CVE]).toEqual({
      entityId: CVE,
      disposition: "investigating",
      reviewedRevisionId: REV,
      reviewedAt: AT,
    });
  });

  it("clears only the targeted record", () => {
    let state = setDisposition(emptyReaderState(), CVE, "addressed", REV, AT);
    state = setDisposition(state, "CVE-2026-0001", "needs_review", REV, AT);
    const cleared = clearDisposition(state, CVE, LATER);

    expect(cleared.reviews[CVE]).toBeUndefined();
    expect(cleared.reviews["CVE-2026-0001"]).toBeDefined();
    expect(state.reviews[CVE]).toBeDefined();
  });
});

describe("setNote", () => {
  it("stores a trimmed note and removes an emptied one", () => {
    const noted = setNote(emptyReaderState(), CVE, "  verify nginx 1.24  ", AT);
    expect(noted.notes[CVE]).toBe("verify nginx 1.24");
    expect(setNote(noted, CVE, "   ", LATER).notes[CVE]).toBeUndefined();
  });
});

describe("isReviewOutdated", () => {
  const review = {
    entityId: CVE,
    disposition: "addressed" as const,
    reviewedRevisionId: REV,
    reviewedAt: AT,
  };

  it("reports a decision as outdated once the record revision moves", () => {
    expect(isReviewOutdated(review, LATER)).toBe(true);
  });

  it("keeps a decision current for the same revision", () => {
    expect(isReviewOutdated(review, REV)).toBe(false);
  });

  it("never claims staleness from an unestablished revision", () => {
    expect(isReviewOutdated(review, null)).toBe(false);
    expect(isReviewOutdated(review, UNKNOWN_REVISION)).toBe(false);
    expect(
      isReviewOutdated(
        { ...review, reviewedRevisionId: UNKNOWN_REVISION },
        LATER
      )
    ).toBe(false);
  });
});

describe("serializeReaderState", () => {
  it("excludes private notes by default and includes them on request", () => {
    const state = setNote(
      setSaved(emptyReaderState(), CVE, true, AT),
      CVE,
      "private detail",
      AT
    );

    expect(serializeReaderState(state)).not.toContain("private detail");
    expect(serializeReaderState(state)).toContain(CVE);
    expect(
      serializeReaderState(state, { includeNotes: true })
    ).toContain("private detail");
  });
});

describe("parseReaderState", () => {
  it("round-trips a serialized state including notes", () => {
    const state = setNote(
      setDisposition(setSaved(emptyReaderState(), CVE, true, AT), CVE, "addressed", REV, AT),
      CVE,
      "note text",
      AT
    );
    const parsed = parseReaderState(
      JSON.parse(serializeReaderState(state, { includeNotes: true }))
    );
    expect(parsed).toEqual(state);
  });

  it("rejects a payload that is not a reader-state document", () => {
    expect(parseReaderState(null)).toBeNull();
    expect(parseReaderState("nope")).toBeNull();
    expect(parseReaderState({ saved: {} })).toBeNull(); // no version
    expect(parseReaderState({ version: 99, saved: {} })).toBeNull();
  });

  it("drops malformed entries instead of failing the whole import", () => {
    const parsed = parseReaderState({
      version: 1,
      saved: { [CVE]: AT, bogus: 42 },
      reviews: {
        [CVE]: {
          entityId: CVE,
          disposition: "not_a_disposition",
          reviewedRevisionId: REV,
          reviewedAt: AT,
        },
        "CVE-2026-0001": {
          disposition: "addressed",
          reviewedRevisionId: REV,
          reviewedAt: AT,
        },
      },
      notes: { [CVE]: "kept", other: null },
      updatedAt: AT,
    });

    expect(parsed?.saved).toEqual({ [CVE]: AT });
    expect(Object.keys(parsed?.reviews ?? {})).toEqual(["CVE-2026-0001"]);
    expect(parsed?.notes).toEqual({ [CVE]: "kept" });
  });

  it("cannot be made to execute content from an imported file", () => {
    const parsed = parseReaderState({
      version: 1,
      saved: {},
      reviews: {},
      notes: { [CVE]: "<script>alert(1)</script>" },
      updatedAt: AT,
    });
    // Retained as inert text for React to escape at render time.
    expect(parsed?.notes[CVE]).toBe("<script>alert(1)</script>");
  });
});

describe("storage accessors", () => {
  it("returns an empty state when nothing is stored", () => {
    expect(loadReaderState()).toEqual(emptyReaderState());
  });

  it("persists notes so a reload recovers the reader's own data", () => {
    const state = setNote(
      setDisposition(setSaved(emptyReaderState(), CVE, true, AT), CVE, "investigating", REV, AT),
      CVE,
      "check the edge nodes",
      AT
    );
    expect(saveReaderState(state)).toBe(true);
    expect(loadReaderState()).toEqual(state);
  });

  it("recovers from corrupt stored JSON instead of throwing", () => {
    window.localStorage.setItem(READER_STATE_STORAGE_KEY, "{not json");
    expect(loadReaderState()).toEqual(emptyReaderState());
  });

  it("clears stored state on reset", () => {
    saveReaderState(setSaved(emptyReaderState(), CVE, true, AT));
    clearStoredReaderState();
    expect(loadReaderState()).toEqual(emptyReaderState());
  });

  it("reports a refused write rather than claiming success", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {},
      },
    });
    expect(saveReaderState(emptyReaderState())).toBe(false);
  });
});
