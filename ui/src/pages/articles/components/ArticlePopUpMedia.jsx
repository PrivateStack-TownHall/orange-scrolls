import { useEffect, useId, useState } from "react";
import { Upload, X, ImageOff } from "lucide-react";

import { getMedia, createMedia } from "../../../services";
import useDialogA11y from "../../../hooks/useDialogA11y";
import {
  ACCEPT_ATTR,
  UPLOAD_HINT,
  validateImageFile,
} from "../../../utils/mediaUpload";

const ArticlePopUpMedia = ({ title = "Media Library", onClose, onSelect }) => {
  const titleId = useId();
  const uploadId = useId();
  const dialogRef = useDialogA11y(true, onClose);

  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchMedia = async () => {
      try {
        const data = await getMedia();
        if (!ignore) setMedias(data);
      } catch (err) {
        console.error("Failed to fetch media", err);
        if (!ignore) setLoadError("Couldn't load the media library.");
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
    const input = e.target;
    const file = input.files?.[0];

    if (!file || uploading) return;

    const problem = validateImageFile(file);

    if (problem) {
      setUploadError(problem);
      input.value = "";
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploading(true);
      setUploadError("");

      const newMedia = await createMedia(formData, { skipErrorModal: true });

      setMedias((prev) => [newMedia, ...prev]);
    } catch (err) {
      console.error("Upload failed", err);
      setUploadError(
        err.response?.data?.message || `Upload failed. Only ${UPLOAD_HINT}`,
      );
    } finally {
      setUploading(false);
      // allow re-selecting the same file again later
      input.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="os-card w-full max-w-[800px] max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            id={titleId}
            className="text-lg font-semibold text-[var(--os-text-main)]"
          >
            {title}
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--os-nav-hover)] text-[var(--os-text-main)]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Upload — the file input stays in the tab order (visually hidden,
            not display:none) and the label shows a focus ring. */}

        <label
          htmlFor={uploadId}
          className="flex items-center justify-center gap-2 mb-1 border border-dashed border-[var(--os-border-main)] rounded p-4 text-sm text-[var(--os-text-main)] cursor-pointer hover:bg-[var(--os-nav-hover)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 transition-colors"
        >
          <Upload size={16} aria-hidden="true" />
          {uploading ? "Uploading..." : "Click to upload a new image"}
          <input
            id={uploadId}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleUpload}
            disabled={uploading}
            className="sr-only"
          />
        </label>

        <p className="text-xs opacity-60 mb-3 text-center">{UPLOAD_HINT}</p>

        {uploadError && (
          <p role="alert" className="text-xs text-red-600 mb-3 text-center">
            {uploadError}
          </p>
        )}

        {/* Media Grid */}

        <div className="grid grid-cols-5 gap-3 overflow-y-auto pr-1">
          {loading && (
            <p
              role="status"
              className="col-span-5 text-sm text-center py-8 opacity-60"
            >
              Loading media...
            </p>
          )}

          {!loading && loadError && (
            <p
              role="alert"
              className="col-span-5 text-sm text-center py-8 text-red-600"
            >
              {loadError}
            </p>
          )}

          {!loading && !loadError && medias.length === 0 && (
            <div className="col-span-5 flex flex-col items-center gap-2 py-8 opacity-60">
              <ImageOff size={24} aria-hidden="true" />
              <p className="text-sm">No media uploaded yet.</p>
            </div>
          )}

          {!loading &&
            medias.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => onSelect(m)}
                aria-label={`Select ${m.name || "media item"}`}
                className="border border-[var(--os-border-soft)] rounded overflow-hidden hover:border-[var(--os-primary)] focus-visible:border-[var(--os-primary)] transition-colors"
              >
                <img
                  src={m.url}
                  alt=""
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
