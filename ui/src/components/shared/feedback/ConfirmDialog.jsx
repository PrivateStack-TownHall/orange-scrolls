import { useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import useDialogA11y from "../../../hooks/useDialogA11y";

function DialogBody({
  title,
  message,
  confirmText,
  cancelText,
  loading,
  loadingText,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descId = useId();

  // Escape / overlay click are ignored while the action is running so the
  // dialog can't be dismissed halfway through a request.
  const ref = useDialogA11y(true, onCancel, {
    closeOnEscape: !loading,
    // Focus the safe option first.
    initialFocusSelector: "[data-cancel]",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <motion.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={loading || undefined}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative os-card w-full max-w-md z-10 text-center"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-red-500" aria-hidden="true" />
        </div>

        {/* Title */}
        <h2 id={titleId} className="text-lg font-semibold mb-2">
          {title}
        </h2>

        {/* Message */}
        <p id={descId} className="text-sm opacity-70 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <button
            type="button"
            data-cancel
            onClick={onCancel}
            disabled={loading}
            className="os-btn-outline disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="os-btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? loadingText : confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false,
  loadingText = "Working...",
  onConfirm,
  onCancel,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <DialogBody
          title={title}
          message={message}
          confirmText={confirmText}
          cancelText={cancelText}
          loading={loading}
          loadingText={loadingText}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </AnimatePresence>
  );
}
