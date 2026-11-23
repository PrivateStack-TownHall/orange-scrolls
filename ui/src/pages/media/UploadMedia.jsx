import { useId, useState } from "react";
import { createMedia } from "../../services";
import { ACCEPT_ATTR, UPLOAD_HINT, validateImageFile } from "../../utils/mediaUpload";

export default function UploadMedia({ onSuccess }) {
  const inputId = useId();
  const errorId = useId();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const selected = e.target.files?.[0] || null;

    setFile(selected);
    setError(selected ? validateImageFile(selected) : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Also guards against a double submit (Enter key + click).
    if (loading) return;

    const problem = validateImageFile(file);

    if (problem) {
      setError(problem);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      setError("");

      await createMedia(formData, { skipErrorModal: true });

      onSuccess?.();
    } catch (err) {
      console.error("Upload failed:", err);
      setError(
        err.response?.data?.message ||
          `Upload failed. Only ${UPLOAD_HINT}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={inputId} className="os-label">
          Select File
        </label>

        <input
          id={inputId}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleChange}
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="os-input"
        />

        <p className="text-xs opacity-60 mt-1">{UPLOAD_HINT}</p>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !file}
        className="os-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
