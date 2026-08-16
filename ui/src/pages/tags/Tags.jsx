import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";

import DataToolbar from "../../components/shared/ui/DataToolbar";
import DataTable from "../../components/shared/ui/DataTable";
import PageHeader from "../../components/shared/layout/PageHeader";

import ConfirmDialog from "../../components/shared/feedback/ConfirmDialog";
import Toast from "../../components/shared/feedback/Toast";
import EmptyState from "../../components/shared/feedback/EmptyState";
import PopUp from "../../components/shared/feedback/PopUp";

import CreateTagForm from "./CreateTag";

import useSearch from "../../hooks/useSearch";

import { getTags, getBrands, getArticles, deleteTag } from "../../services";

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [brands, setBrands] = useState([]);
  const [articleCounts, setArticleCounts] = useState({});

  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  // FETCH DATA
  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        const [tagsData, brandsData, articlesData] = await Promise.all([
          getTags(),
          getBrands(),
          getArticles(),
        ]);

        if (ignore) return;

        setTags(tagsData);
        setBrands(brandsData);

        // Tally article counts per tag client-side (the tags endpoint
        // doesn't include the join-table relation).
        const counts = {};
        articlesData.forEach((article) => {
          article.tags?.forEach((item) => {
            counts[item.tagId] = (counts[item.tagId] || 0) + 1;
          });
        });
        setArticleCounts(counts);
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, []);

  const { query, setQuery, filteredData } = useSearch(tags, ["name"]);

  // GROUP TAGS BY BRAND
  const groupedTags = brands.map((brand) => ({
    ...brand,
    tags: filteredData.filter((tag) => tag.brandId === brand.id),
  }));

  // DELETE TAG
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteTag(deleteTarget.id);

      const updated = tags.filter((t) => t.id !== deleteTarget.id);

      setTags(updated);

      setToast({
        show: true,
        type: "success",
        message: "Tag deleted",
      });

      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  const editSuccess = () => {
    setEditTarget(null);

    setToast({ show: true, type: "success", message: "Tag updated" });

    getTags().then(setTags);
  };

  const columns = [
    { key: "id", label: "#" },

    {
      key: "name",
      label: "Tag Name",
      render: (row) => (
        <span className="flex items-center gap-2 font-medium">
          <img
            src="/icons/tags.png"
            alt=""
            className="w-5 h-5 object-contain"
          />
          {row.name}
        </span>
      ),
    },

    {
      key: "articles",
      label: "Articles",
      render: (row) => articleCounts[row.id] ?? 0,
    },

    {
      key: "createdAt",
      label: "Created At",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },

    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditTarget(row)}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="Edit tag"
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="Delete tag"
          >
            <img
              src="/icons/torn_scroll.png"
              alt=""
              className="w-3.5 h-3.5 object-contain"
            />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-sm opacity-70">Loading tags...</div>;
  }

  return (
    <div>
      {/* HEADER */}

      <PageHeader
        title="Tags"
        breadcrumb={[{ label: "Dashboard", path: "/" }, { label: "Tags" }]}
        action={
          <button onClick={() => setOpenCreate(true)} className="os-btn-primary">
            + Create Tag
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

      {/* EMPTY */}

      {filteredData.length === 0 && (
        <EmptyState title="No Tags" description="Create your first tag." />
      )}

      {/* TAG BOARD VIEW */}

      {view === "grid" && filteredData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groupedTags.map((brand) => (
            <div key={brand.id} className="os-card">
              <h2 className="font-semibold mb-3">{brand.name}</h2>

              <div className="flex flex-wrap gap-2">
                {brand.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="flex items-center gap-1.5 text-xs pl-3 pr-2 py-1.5 rounded-full bg-[var(--os-nav-hover)] hover:bg-[var(--os-nav-active)] transition-colors"
                  >
                    <img
                      src="/icons/tags.png"
                      alt=""
                      className="w-3.5 h-3.5 object-contain"
                    />
                    #{tag.name}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tag)}
                      aria-label={`Delete ${tag.name}`}
                      className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {brand.tags.length === 0 && (
                  <span className="text-xs opacity-50">No tags</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}

      {view === "table" && filteredData.length > 0 && (
        <div className="os-card">
          <DataTable columns={columns} data={filteredData} />
        </div>
      )}

      {/* CREATE TAG POPUP */}

      <PopUp
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Create Tag"
      >
        <CreateTagForm
          onSuccess={() => {
            setOpenCreate(false);

            setToast({
              show: true,
              type: "success",
              message: "Tag created",
            });

            getTags().then(setTags);
          }}
        />
      </PopUp>

      {/* EDIT TAG POPUP */}

      <PopUp
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Tag"
      >
        {editTarget && (
          <CreateTagForm initialData={editTarget} onSuccess={editSuccess} />
        )}
      </PopUp>

      {/* CONFIRM DELETE */}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Tag"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
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
