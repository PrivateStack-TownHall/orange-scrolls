import { X } from "lucide-react";
import FieldError from "./FieldError";

/** Gallery images for an article (ArticleMedia type "gallery"). */
export default function GalleryField({ items, onAdd, onRemove, error }) {
  return (
    <div className="mt-1">
      <p className="os-label">Gallery</p>

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 mb-2">
          {items.map((m) => (
            <li key={m.id} className="relative">
              <img
                src={m.url}
                alt={m.name || "Gallery image"}
                className="w-full h-16 object-cover rounded"
              />

              <button
                type="button"
                onClick={() => onRemove(m.id)}
                aria-label={`Remove ${m.name || "image"} from gallery`}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:bg-black/80"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="os-btn-outline w-full text-sm"
      >
        + Add gallery image
      </button>

      <FieldError id="media-error" message={error} />
    </div>
  );
}
