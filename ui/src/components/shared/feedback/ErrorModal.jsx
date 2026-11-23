import { useId } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import useDialogA11y from "../../../hooks/useDialogA11y";

function ErrorModalBody({ onClose, title, message, statusCode, code }) {
  const titleId = useId();
  const descId = useId();
  const ref = useDialogA11y(true, onClose);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className="relative os-card w-full max-w-md z-10"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2
              id={titleId}
              className="text-lg font-semibold text-[var(--os-text-main)]"
            >
              {title || "Something went wrong"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-[var(--os-nav-hover)]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p
          id={descId}
          className="text-sm text-[var(--os-text-main)] opacity-90 whitespace-pre-wrap"
        >
          {message}
        </p>

        {(statusCode || code) && (
          <p className="text-xs opacity-50 mt-3 font-mono">
            {statusCode ? `HTTP ${statusCode}` : ""}
            {statusCode && code ? " · " : ""}
            {code || ""}
          </p>
        )}

        <div className="flex justify-end mt-5">
          <button type="button" onClick={onClose} className="os-btn-secondary">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  statusCode,
  code,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <ErrorModalBody
          onClose={onClose}
          title={title}
          message={message}
          statusCode={statusCode}
          code={code}
        />
      )}
    </AnimatePresence>
  );
}
