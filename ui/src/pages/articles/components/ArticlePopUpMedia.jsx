import { useEffect, useState } from "react";
import { Upload, X, ImageOff } from "lucide-react";

import { getMedia, createMedia } from "../../../services";

const ArticlePopUpMedia = ({ onClose, onSelect }) => {
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchMedia = async () => {
      try {
        const data = await getMedia();
        if (!ignore) setMedias(data);
      } catch (err) {
        console.error("Failed to fetch media", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMedia();

    // avoid setting state if the popup closes/unmounts before the fetch resolves
    return () => {
      ignore = true;
    };
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploading(true);

      const newMedia = await createMedia(formData);

      setMedias((prev) => [newMedia, ...prev]);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
      // allow re-selecting the same file again later
      e.target.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="os-card w-full max-w-[800px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[var(--os-text-main)]">
            Media Library
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--os-nav-hover)] text-[var(--os-text-main)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload */}

        <label
          className="flex items-center justify-center gap-2 mb-4 border border-dashed border-[var(--os-border-main)] rounded p-4 text-sm text-[var(--os-text-main)] cursor-pointer hover:bg-[var(--os-nav-hover)] transition-colors"
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : "Click to upload a new image"}
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>

        {/* Media Grid */}

        <div className="grid grid-cols-5 gap-3 overflow-y-auto pr-1">
          {loading && (
            <p className="col-span-5 text-sm text-center py-8 opacity-60">
              Loading media...
            </p>
          )}

          {!loading && medias.length === 0 && (
            <div className="col-span-5 flex flex-col items-center gap-2 py-8 opacity-60">
              <ImageOff size={24} />
              <p className="text-sm">No media uploaded yet.</p>
            </div>
          )}

          {!loading &&
            medias.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => onSelect(m)}
                className="border border-[var(--os-border-soft)] rounded overflow-hidden hover:border-[var(--os-primary)] transition-colors"
              >
                <img
                  src={m.url}
                  alt={m.name || "Media item"}
                  className="object-cover w-full h-24"
                />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ArticlePopUpMedia;
