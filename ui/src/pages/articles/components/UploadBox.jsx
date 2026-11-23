import { X } from "lucide-react";

/**
 * Click-to-choose media slot (thumbnail / cover). A real <button> so it is
 * reachable and operable with the keyboard; the optional remove button is a
 * separate control (never nested inside the first one).
 */
function UploadBox({ label, image, onClick, onRemove }) {
  return (
    <div className="relative mb-3">
      <button
        type="button"
        onClick={onClick}
        aria-label={
          image ? `Change ${label.toLowerCase()}` : `Select ${label.toLowerCase()}`
        }
        className="block w-full border border-dashed border-[#B08968] rounded p-4 text-center cursor-pointer hover:bg-[#f5e9d8] focus-visible:bg-[#f5e9d8]"
      >
        {image ? (
          <img
            src={image.url}
            alt={`${label} preview`}
            className="w-full h-32 object-cover rounded"
          />
        ) : (
          <>
            <span className="block text-sm mb-2">{label}</span>
            <span className="block text-xs opacity-60">
              Click to select media
            </span>
          </>
        )}
      </button>

      {image && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label.toLowerCase()}`}
          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:bg-black/80"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default UploadBox;
