// components/ui/CopyButton.tsx
// Small copy-to-clipboard button with a brief "Copied" confirmation. When the
// Clipboard API is unavailable (non-secure context, permissions, etc.) it
// falls back to a native <dialog> with a manual-copy textarea so the value is
// never lost.

"use client";

import { useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  /** The text to copy to the clipboard. */
  value: string;
  /** Short idle label shown on the button. */
  label?: string;
  /** Accessible name for the button (defaults to "${label} to clipboard"). */
  ariaLabel?: string;
  /** Extra class names appended to the default button styling. */
  className?: string;
}

export default function CopyButton({
  value,
  label = "Copy",
  ariaLabel = `${label} to clipboard`,
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Revert the "Copied" label after 2 seconds.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // Open the manual-copy dialog as a modal (focus trap + Escape for free).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (showFallback && dialog && !dialog.open) {
      dialog.showModal();
    }
  }, [showFallback]);

  const closeFallback = () => {
    setShowFallback(false);
    dialogRef.current?.close();
  };

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        return;
      } catch {
        // Clipboard rejected (permissions, non-secure context, etc.).
      }
    }
    setShowFallback(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={ariaLabel}
        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
          copied
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            : "border-ui-control-border bg-ui-canvas text-ui-secondary hover:border-ui-muted hover:text-ui-text"
        } ${className}`}
      >
        {copied ? "Copied" : label}
        <span aria-live="polite" className="sr-only">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </button>

      {showFallback && (
        <dialog
          ref={dialogRef}
          onClose={closeFallback}
          className="m-auto rounded-lg border border-ui-border bg-ui-surface p-0 text-ui-text backdrop:bg-black/60"
          aria-label="Clipboard unavailable"
        >
          <div className="p-4">
            <h2 className="text-sm font-semibold text-ui-text">
              Clipboard unavailable
            </h2>
            <p className="mt-1 text-xs text-ui-muted">
              Your browser blocked clipboard access — copy the text below
              manually.
            </p>
            <textarea
              readOnly
              value={value}
              rows={2}
              onFocus={(e) => e.currentTarget.select()}
              className="control mt-3 w-full"
              aria-label="Text to copy"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={closeFallback}
                className="rounded-md border border-ui-control-border bg-ui-canvas px-3 py-1.5 text-xs font-medium text-ui-secondary transition-colors hover:border-ui-muted hover:text-ui-text"
              >
                Close
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}