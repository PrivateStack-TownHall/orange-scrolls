import { useId } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import useDialogA11y from "../../../hooks/useDialogA11y";

function PopUpBody({ onClose, title, children, width }) {
  const titleId = useId();
  const ref = useDialogA11y(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <motion.div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative os-card w-full ${width} z-10`}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded hover:bg-gray-200"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        {children}
      </motion.div>
    </div>
  );
}

export default function PopUp({
  isOpen,
  onClose,
  title,
  children,
  width = "max-w-lg",
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <PopUpBody onClose={onClose} title={title} width={width}>
          {children}
        </PopUpBody>
      )}
    </AnimatePresence>
  );
}
