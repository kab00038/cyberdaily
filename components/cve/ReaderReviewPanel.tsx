// components/cve/ReaderReviewPanel.tsx
// Reader-owned decision surface for one CVE record: save, review status, a
// private note, and export/import/reset of the browser-local state.
//
// Everything here is stored in this browser only. The panel says so, reports
// a refused write rather than pretending it succeeded, and treats a recorded
// decision as the reader's own note — not a verification by CyberDaily.

"use client";

import { useEffect, useRef, useState } from "react";
import {
  DISPOSITIONS,
  DISPOSITION_LABELS,
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
import type { ReaderState } from "@/lib/reader-state";

export interface ReaderReviewPanelProps {
  /** Canonical CVE identifier this decision belongs to. */
  cveId: string;
  /** Current record revision, or null when the provider supplied none. */
  revisionId: string | null;
}

export default function ReaderReviewPanel({
  cveId,
  revisionId,
}: ReaderReviewPanelProps) {
  const [state, setState] = useState<ReaderState>(emptyReaderState);
  const [hydrated, setHydrated] = useState(false);
  const [persistFailed, setPersistFailed] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [includeNote, setIncludeNote] = useState(false);
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  // The last state written to storage, so the persist effect can skip the
  // redundant write that hydration itself would otherwise trigger.
  const persistedRef = useRef<ReaderState | null>(null);

  // Read storage after mount so the server-rendered markup and the first
  // client render agree (both show the empty state).
  useEffect(() => {
    const loaded = loadReaderState();
    persistedRef.current = loaded;
    setState(loaded);
    setNoteDraft(loaded.notes[cveId] ?? "");
    setHydrated(true);
  }, [cveId]);

  // Persist each committed state once. This lives in an effect rather than
  // inside a state updater because React may invoke an updater more than once,
  // and a write is not idempotent from the storage layer's point of view.
  useEffect(() => {
    if (!hydrated) return;
    if (persistedRef.current === state) return;
    persistedRef.current = state;
    setPersistFailed(!saveReaderState(state));
  }, [state, hydrated]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirmReset && dialog && !dialog.open) dialog.showModal();
  }, [confirmReset]);

  const isSaved = hydrated && cveId in state.saved;
  const review = state.reviews[cveId];
  const outdated =
    review !== undefined && isReviewOutdated(review, revisionId);
  const noteDirty = hydrated && noteDraft.trim() !== (state.notes[cveId] ?? "");

  const handleToggleSave = () => {
    const at = new Date().toISOString();
    setState((prev) => setSaved(prev, cveId, !(cveId in prev.saved), at));
  };

  const handleDisposition = (value: string) => {
    const at = new Date().toISOString();
    setState((prev) => {
      if (value === "") return clearDisposition(prev, cveId, at);
      if (!isDisposition(value)) return prev;
      return setDisposition(
        prev,
        cveId,
        value,
        revisionId ?? UNKNOWN_REVISION,
        at
      );
    });
  };

  /**
   * Commit the note. The value is passed in rather than read from `noteDraft`
   * so the write reflects what the field actually holds at commit time — a
   * blur that immediately follows a keystroke must not persist the previous
   * render's text.
   */
  const commitNote = (value: string) => {
    if (!hydrated) return;
    const at = new Date().toISOString();
    setState((prev) => {
      if (prev.notes[cveId] === value.trim()) return prev;
      return setNote(prev, cveId, value, at);
    });
    setStatus("Note saved in this browser.");
  };

  const handleExport = () => {
    const json = serializeReaderState(state, { includeNotes: includeNote });
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cyberdaily-reader-state.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(
      includeNote
        ? "Exported, including your private note."
        : "Exported without private notes."
    );
  };

  const handleImport = async (file: File) => {
    let parsed: ReaderState | null = null;
    try {
      parsed = parseReaderState(JSON.parse(await file.text()));
    } catch {
      parsed = null;
    }
    if (parsed === null) {
      setStatus("That file is not a readable CyberDaily reader-state export.");
      return;
    }
    setState(parsed);
    setNoteDraft(parsed.notes[cveId] ?? "");
    setStatus(
      `Imported ${Object.keys(parsed.saved).length} saved and ${
        Object.keys(parsed.reviews).length
      } reviewed records.`
    );
  };

  const handleReset = () => {
    const cleared = emptyReaderState();
    clearStoredReaderState();
    // Record the cleared state as already-persisted so the effect above does
    // not immediately write an empty document back after the removal.
    persistedRef.current = cleared;
    setState(cleared);
    setNoteDraft("");
    setPersistFailed(false);
    setStatus("Local state cleared from this browser.");
    setConfirmReset(false);
    dialogRef.current?.close();
  };

  return (
    <section className="panel rounded-lg overflow-hidden">
      <div className="panel-header flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">Your review</h2>
        <button
          type="button"
          onClick={handleToggleSave}
          aria-pressed={isSaved}
          className={`inline-flex min-h-11 items-center rounded border px-3 py-2 text-xs font-medium transition-colors ${
            isSaved
              ? "border-ui-accent bg-ui-accent-soft text-ui-accent"
              : "border-ui-control-border bg-ui-canvas text-ui-secondary hover:border-ui-muted hover:text-ui-text"
          }`}
        >
          {isSaved ? "Saved" : "Save record"}
        </button>
      </div>

      <div className="panel-body space-y-4">
        {outdated && (
          <p role="status" className="state-note">
            This record was revised after your review on{" "}
            {review.reviewedAt.slice(0, 10)}. The status below may no longer
            describe the current record.
          </p>
        )}

        {persistFailed && (
          <p role="status" className="state-note">
            This browser refused to store the change, so it will not survive a
            reload. Private browsing and a full storage quota both cause this.
          </p>
        )}

        <div>
          <label htmlFor="review-disposition" className="control-label">
            Review status
          </label>
          <select
            id="review-disposition"
            className="control w-full sm:w-64"
            value={review?.disposition ?? ""}
            onChange={(e) => handleDisposition(e.target.value)}
          >
            <option value="">Not reviewed</option>
            {DISPOSITIONS.map((value) => (
              <option key={value} value={value}>
                {DISPOSITION_LABELS[value]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] leading-relaxed text-ui-muted">
            Records your own decision on this record. “Addressed” notes that you
            resolved it; it is not a CyberDaily verification that a fix shipped.
          </p>
        </div>

        <div>
          <label htmlFor="review-note" className="control-label">
            Private note
          </label>
          <textarea
            id="review-note"
            className="control w-full"
            rows={3}
            placeholder="What to verify, or what you decided."
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={(e) => commitNote(e.currentTarget.value)}
          />
          <div className="mt-2 flex items-center gap-3">
            {noteDirty && (
              <button
                type="button"
                onClick={() => commitNote(noteDraft)}
                className="rounded border border-ui-control-border bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-secondary transition-colors hover:border-ui-muted hover:text-ui-text"
              >
                Save note
              </button>
            )}
            <span className="text-[11px] text-ui-muted">
              Stays in this browser. Never included in a public link.
            </span>
          </div>
        </div>

        <div className="border-t border-ui-border pt-4">
          <p className="text-[11px] leading-relaxed text-ui-muted">
            Saved and reviewed records live in this browser only, and clearing
            site data removes them. Export to keep a copy.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-ui-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--cd-accent)]"
                checked={includeNote}
                onChange={(e) => setIncludeNote(e.target.checked)}
              />
              Include private note in export
            </label>

            <button
              type="button"
              onClick={handleExport}
              className="rounded border border-ui-control-border bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-secondary transition-colors hover:border-ui-muted hover:text-ui-text"
            >
              Export state
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-ui-control-border bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-secondary transition-colors hover:border-ui-muted hover:text-ui-text"
            >
              Import state
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Import reader state from a JSON file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // Reset so re-selecting the same file fires a change event.
                e.target.value = "";
                if (file) void handleImport(file);
              }}
            />

            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="rounded border border-ui-control-border bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-secondary transition-colors hover:border-ui-critical hover:text-ui-critical"
            >
              Reset
            </button>
          </div>

          <p role="status" className="mt-2 min-h-4 text-[11px] text-ui-secondary">
            {status}
          </p>
        </div>
      </div>

      {confirmReset && (
        <dialog
          ref={dialogRef}
          onClose={() => setConfirmReset(false)}
          className="m-auto rounded-lg border border-ui-border bg-ui-surface p-0 text-ui-text backdrop:bg-black/60"
          aria-label="Confirm clearing local state"
        >
          <div className="p-4">
            <h2 className="text-sm font-semibold text-ui-text">
              Clear local state?
            </h2>
            <p className="mt-1 text-xs text-ui-muted">
              Removes every saved record, review status, and private note stored
              in this browser. Export first if you want to keep them.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmReset(false);
                  dialogRef.current?.close();
                }}
                className="rounded-md border border-ui-control-border bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-secondary transition-colors hover:border-ui-muted hover:text-ui-text"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-md border border-ui-critical bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-critical transition-colors"
              >
                Clear everything
              </button>
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
