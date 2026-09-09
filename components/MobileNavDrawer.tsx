// components/MobileNavDrawer.tsx — Accessible mobile navigation drawer.
// Built on the native <dialog> with showModal() so we get a focus trap and
// Escape-to-close for free. On top of that we add: a visible close button,
// focus moved into the drawer on open and restored to the trigger on close,
// a backdrop click handler, and background scroll locking.
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/components/navigation";

export default function MobileNavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  // Open/close the dialog and manage focus + scroll lock.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      // Remember what had focus so we can restore it when the drawer closes.
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      document.body.style.overflow = "hidden";
      closeButtonRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Backdrop click (click outside the dialog's content) and close handling.
  useEffect(() => {
    const ref = dialogRef.current;
    if (!ref) return;
    const dialog: HTMLDialogElement = ref;

    function handleBackdropClick(e: MouseEvent) {
      const rect = dialog.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isInside) onClose();
    }

    function handleClose() {
      // Native Escape + close() both fire a "close" event. Unlock scroll and
      // hand focus back to whatever opened the drawer.
      document.body.style.overflow = "";
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      onClose();
    }

    dialog.addEventListener("click", handleBackdropClick);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("click", handleBackdropClick);
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  return (
    <dialog
      id="mobile-nav-drawer"
      ref={dialogRef}
      className="cd-mobile-nav m-0 h-full w-full max-w-xs bg-ui-sidebar text-ui-text"
      aria-label="Navigation"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between p-5 border-b border-ui-border">
          <span className="flex items-center gap-3">
            <span className="brand-mark" aria-hidden="true">cd</span>
            <span className="brand-wordmark">CyberDaily</span>
          </span>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="icon-button"
            aria-label="Close navigation"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className="nav-link"
              >
                <span
                  className="flex-shrink-0"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </dialog>
  );
}