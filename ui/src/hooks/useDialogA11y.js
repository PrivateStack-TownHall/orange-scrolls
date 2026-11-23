import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard behaviour every modal dialog needs:
 *  - Escape closes it (unless `closeOnEscape` is false, e.g. while saving)
 *  - focus moves into the dialog when it opens and returns to the element
 *    that opened it when it closes
 *  - Tab / Shift+Tab stay inside the dialog
 *
 * Attach the returned ref to the dialog container.
 */
export default function useDialogA11y(
  isOpen,
  onClose,
  { closeOnEscape = true, initialFocusSelector } = {},
) {
  const ref = useRef(null);
  // Keep the latest callback without re-running the effect (and thereby
  // stealing focus) every time the parent re-renders.
  const onCloseRef = useRef(onClose);
  const escapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    escapeRef.current = closeOnEscape;
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const node = ref.current;

    if (node) {
      const preferred = initialFocusSelector
        ? node.querySelector(initialFocusSelector)
        : null;
      const first = preferred || node.querySelector(FOCUSABLE);
      (first || node).focus?.();
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (escapeRef.current) {
          e.stopPropagation();
          onCloseRef.current?.();
        }
        return;
      }

      if (e.key !== "Tab" || !ref.current) return;

      const items = Array.from(ref.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, initialFocusSelector]);

  return ref;
}
