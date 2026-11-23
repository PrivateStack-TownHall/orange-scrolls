import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw } from "lucide-react";

import ArticleCard from "./components/ArticleCard";
import DataToolbar from "../../components/shared/ui/DataToolbar";
import DataTable from "../../components/shared/ui/DataTable";
import PageHeader from "../../components/shared/layout/PageHeader";

import Alert from "../../components/shared/feedback/Alert";
import Toast from "../../components/shared/feedback/Toast";
import EmptyState from "../../components/shared/feedback/EmptyState";
import ConfirmDialog from "../../components/shared/feedback/ConfirmDialog";
import Badge from "../../components/shared/ui/Badge";

import useSearch from "../../hooks/useSearch";

import {
  getArticles,
  deleteArticle,
  restoreArticle,
} from "../../services";

export default function Articles() {
  const [articles, setArticles] = useState([]);
  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);

  // "Deleted" view: soft-deleted articles, which can be restored.
  const [showDeleted, setShowDeleted] = useState(false);

  const [error, setError] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringIds, setRestoringIds] = useState(() => new Set());

  // FETCH ARTICLES (live or deleted, depending on the view)
  useEffect(() => {
    // Ignore a response that arrives after the person switched views or
    // left the page, so an old list can't overwrite the current one.
    let ignore = false;

    const fetchArticles = async () => {
      try {
        const data = await getArticles({ deleted: showDeleted });
        if (ignore) return;

        setArticles(data);
        setError(null);
      } catch (err) {
        console.error(err);
        if (!ignore) setError("Failed to load articles");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchArticles();

    return () => {
      ignore = true;
    };
  }, [showDeleted]);

  const switchView = (deleted) => {
    if (deleted === showDeleted) return;

    setLoading(true);
    setArticles([]);
    setShowDeleted(deleted);
  };

  const { query, setQuery, filteredData } = useSearch(articles, [
    "title",
    "brand",
    "category",
  ]);

  // DELETE HANDLER (soft delete)
  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;

    const target = deleteTarget;

    try {
      setDeleting(true);

      await deleteArticle(target.id, { skipErrorModal: true });

      setArticles((prev) => prev.filter((a) => a.id !== target.id));
      setError(null);
      setToast({
        show: true,
        type: "success",
        message: "Article deleted. You can restore it from the Deleted view.",
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to delete article");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // RESTORE HANDLER
  const handleRestore = async (article) => {
    if (restoringIds.has(article.id)) return;

    setRestoringIds((prev) => new Set(prev).add(article.id));

    try {
      await restoreArticle(article.id, { skipErrorModal: true });

      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      setError(null);
      setToast({
        show: true,
        type: "success",
        message: `"${article.title}" restored`,
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to restore article");
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(article.id);
        return next;
      });
    }
  };

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (row) =>
        showDeleted ? (
          <span className="font-medium">{row.title}</span>
        ) : (
          <Link
            to={`/articles/${row.slug}`}
            className="hover:text-blue-600 font-medium"
          >
            {row.title}
          </Link>
        ),
    },

    {
      key: "brand",
      label: "Brand",
      render: (row) => row.brand?.name,
    },

    {
      key: "category",
      label: "Category",
      render: (row) => row.category?.name,
    },

    {
      key: "status",
      label: "Status",
      render: (row) => <Badge status={row.status} label={row.status} />,
    },
    { key: "author", label: "Author" },

    {
      key: "createdAt",
      label: "Date",
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },

    { key: "views", label: "Views" },

    {
      key: "actions",
      label: "Actions",
      render: (row) =>
        showDeleted ? (
          <button
            type="button"
            onClick={() => handleRestore(row)}
            disabled={restoringIds.has(row.id)}
            aria-label={`Restore ${row.title}`}
            className="flex items-center gap-1 text-xs text-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw size={14} aria-hidden="true" />
            {restoringIds.has(row.id) ? "Restoring..." : "Restore"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
            className="flex items-center gap-1 text-xs text-red-600"
          >
            <img
              src="/icons/torn_scroll.png"
              alt=""
              className="w-4 h-4 object-contain"
            />
            Delete
          </button>
        ),
    },
  ];

  if (loading) {
    return (
      <div role="status" className="text-sm opacity-70">
        Loading articles...
      </div>
    );
  }

  return (
    <div>
      {/* ERROR ALERT */}

      {error && (
        <div className="mb-6">
          <Alert type="error" message={error} />
        </div>
      )}

      {/* HEADER */}

      <PageHeader
        title={showDeleted ? "Deleted Articles" : "Articles"}
        breadcrumb={[
          { label: "Dashboard", path: "/" },
          { label: showDeleted ? "Deleted Articles" : "Articles" },
        ]}
        action={
          <Link to="/articles/create" className="os-btn-primary">
            + Create Scroll
          </Link>
        }
      />

      {/* LIVE / DELETED SWITCH */}

      <div
        role="group"
        aria-label="Article list"
        className="flex gap-2 mb-4"
      >
        <button
          type="button"
          aria-pressed={!showDeleted}
          onClick={() => switchView(false)}
          className={`os-btn-outline text-sm ${
            !showDeleted ? "os-nav-active" : ""
          }`}
        >
          Articles
        </button>

        <button
          type="button"
          aria-pressed={showDeleted}
          onClick={() => switchView(true)}
          className={`os-btn-outline text-sm ${
            showDeleted ? "os-nav-active" : ""
          }`}
        >
          Deleted
        </button>
      </div>

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
          title={showDeleted ? "Nothing deleted" : "No Articles"}
          description={
            showDeleted
              ? "Deleted articles show up here so you can restore them."
              : "Create your first scroll."
          }
        />
      )}

      {/* GRID VIEW */}

      {view === "grid" && filteredData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {filteredData.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              setDeleteTarget={setDeleteTarget}
              onRestore={handleRestore}
              isDeleted={showDeleted}
              busy={restoringIds.has(article.id)}
            />
          ))}
        </div>
      )}

      {/* TABLE VIEW */}

      {view === "table" && filteredData.length > 0 && (
        <div className="os-card">
          <DataTable columns={columns} data={filteredData} />
        </div>
      )}

      {/* CONFIRM DELETE */}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Article"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be hidden from the article list and the site. You can restore it later from the Deleted view.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        loading={deleting}
        loadingText="Deleting..."
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
