import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

import DataToolbar from "../../components/shared/ui/DataToolbar";
import DataTable from "../../components/shared/ui/DataTable";
import PageHeader from "../../components/shared/layout/PageHeader";
import PopUp from "../../components/shared/feedback/PopUp";
import EmptyState from "../../components/shared/feedback/EmptyState";

import UploadMedia from "./UploadMedia";

import useSearch from "../../hooks/useSearch";

import { getMedia, deleteMedia } from "../../services";
import ConfirmDialog from "../../components/shared/feedback/ConfirmDialog";
import Toast from "../../components/shared/feedback/Toast";

export default function MediaLibrary() {
  const [media, setMedia] = useState([]);
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);

  const [openUpload, setOpenUpload] = useState(false);
  const [preview, setPreview] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Set when the API answers 409: the media is still used by articles and
  // needs an explicit second confirmation before it is force-deleted.
  const [inUse, setInUse] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // Initial load, guarded so we don't setState if the component unmounts
  // before the request resolves.
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const data = await getMedia();
        if (!ignore) setMedia(data);
      } catch (err) {
        console.error("Failed to fetch media:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, []);

  // Manual refetch, reused after delete/upload succeed.
  const fetchMedia = async () => {
    try {
      const data = await getMedia();
      setMedia(data);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
  };

  const finishDelete = (message) => {
    setToast({ show: true, type: "success", message });
    fetchMedia();
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    const target = deleteTarget;

    try {
      setDeleting(true);

      await deleteMedia(target.id, { skipErrorModal: true });

      finishDelete("Media deleted successfully");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete media:", err);

      if (err.response?.status === 409) {
        // Still used by articles -> ask again, naming them.
        setInUse({
          media: target,
          message: err.response.data?.message,
          articles: err.response.data?.details?.articles || [],
        });
      } else {
        setToast({
          show: true,
          type: "error",
          message: err.response?.data?.message || "Failed to delete media",
        });
      }

      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // Second, explicit confirmation: detach from every article and delete.
  const handleForceDelete = async () => {
    if (!inUse || deleting) return;

    try {
      setDeleting(true);

      await deleteMedia(inUse.media.id, { force: true, skipErrorModal: true });

      finishDelete("Media deleted and removed from the articles using it");
    } catch (err) {
      console.error("Failed to force delete media:", err);

      setToast({
        show: true,
        type: "error",
        message: err.response?.data?.message || "Failed to delete media",
      });
    } finally {
      setDeleting(false);
      setInUse(null);
    }
  };

  const { query, setQuery, filteredData } = useSearch(media, ["name"]);

  const columns = [
    {
      key: "preview",
      label: "Preview",
      render: (row) => (
        <button
          type="button"
          onClick={() => setPreview(row)}
          aria-label={`Preview ${row.name}`}
          className="rounded"
        >
          <img
            src={row.url}
            alt=""
            className="w-16 h-12 object-cover rounded border border-[var(--os-border-soft)] cursor-pointer"
          />
        </button>
      ),
    },
    {
      key: "name",
      label: "File Name",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        // NOTE: was previously calling handleDelete(row.id) directly, but
        // handleDelete reads from `deleteTarget` state and ignores its
        // argument — so this button silently did nothing. Fixed to go
        // through the same confirm-dialog flow the grid view uses.
        <button
          type="button"
          onClick={() => confirmDelete(row)}
          className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
          aria-label={`Delete ${row.name}`}
          title="Delete media"
        >
          <img
            src="/icons/torn_scroll.png"
            alt=""
            className="w-3.5 h-3.5 object-contain"
          />
        </button>
      ),
    },
  ];

  if (loading) {
    return <div className="text-sm opacity-70">Loading media...</div>;
  }

  return (
    <div>
      {/* HEADER */}
      <PageHeader
        title="Media Library"
        breadcrumb={[{ label: "Dashboard", path: "/" }, { label: "Media" }]}
        action={
          <button
            type="button"
            onClick={() => setOpenUpload(true)}
            className="os-btn-primary flex items-center gap-2"
          >
            <Upload size={16} />
            Upload Media
          </button>
        }
      />

      {/* TOOLBAR */}
      <DataToolbar
        view={view}
        setView={setView}
        search={query}
        setSearch={setQuery}
      />

      {/* EMPTY STATE */}
      {filteredData.length === 0 && (
        <EmptyState
          title="No Media"
          description="Upload your first file to get started."
        />
      )}

      {/* TABLE VIEW */}
      {view === "table" && filteredData.length > 0 && (
        <div className="os-card">
          <DataTable columns={columns} data={filteredData} />
        </div>
      )}

      {/* GRID VIEW */}
      {view === "grid" && filteredData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="os-card-compact os-hover-lift animate-in-fade relative group"
            >
              {/* DELETE ICON */}
              <button
                type="button"
                onClick={() => confirmDelete(item)}
                className="absolute top-3 right-3 p-1 rounded hover:bg-[var(--os-nav-hover)] focus-visible:bg-[var(--os-nav-hover)] transition-colors"
                aria-label={`Delete ${item.name}`}
                title="Delete media"
              >
                <img
                  src="/icons/torn_scroll.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                />
              </button>

              {/* IMAGE */}
              <button
                type="button"
                onClick={() => setPreview(item)}
                aria-label={`Preview ${item.name}`}
                className="block w-full rounded"
              >
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-32 object-cover rounded cursor-pointer"
                />
              </button>

              {/* FILE NAME */}
              <div className="text-xs p-2 truncate">{item.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* UPLOAD POPUP */}
      <PopUp
        isOpen={openUpload}
        title="Upload Media"
        onClose={() => setOpenUpload(false)}
      >
        <UploadMedia
          onSuccess={() => {
            fetchMedia();
            setOpenUpload(false);
          }}
        />
      </PopUp>

      {/* IMAGE PREVIEW POPUP */}
      <PopUp
        isOpen={!!preview}
        title={preview?.name}
        width="max-w-3xl"
        onClose={() => setPreview(null)}
      >
        {preview && (
          <img
            src={preview.url}
            alt={preview.name}
            className="w-full rounded"
          />
        )}
      </PopUp>
      {/* DELETE CONFIRM */}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Media"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        loadingText="Deleting..."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* STILL IN USE -> explicit second confirmation */}
      <ConfirmDialog
        isOpen={!!inUse}
        title="Media is still in use"
        message={
          inUse
            ? `"${inUse.media.name}" is used by ${inUse.articles.length || "some"} article(s)${
                inUse.articles.length
                  ? `: ${inUse.articles
                      .slice(0, 5)
                      .map((a) => a.title)
                      .join(", ")}${inUse.articles.length > 5 ? ", …" : ""}`
                  : ""
              }. Deleting it will remove it from those articles. This cannot be undone.`
            : ""
        }
        confirmText="Delete anyway"
        cancelText="Keep it"
        loading={deleting}
        loadingText="Deleting..."
        onConfirm={handleForceDelete}
        onCancel={() => setInUse(null)}
      />

      {/* TOAST */}

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </div>
  );
}
