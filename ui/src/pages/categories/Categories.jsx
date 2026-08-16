import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";

import DataToolbar from "../../components/shared/ui/DataToolbar";
import DataTable from "../../components/shared/ui/DataTable";
import PageHeader from "../../components/shared/layout/PageHeader";

import PopUp from "../../components/shared/feedback/PopUp";
import ConfirmDialog from "../../components/shared/feedback/ConfirmDialog";
import Toast from "../../components/shared/feedback/Toast";
import EmptyState from "../../components/shared/feedback/EmptyState";

import CreateCategoryForm from "./CreateCategory";

import useSearch from "../../hooks/useSearch";

import {
  getCategories,
  getBrands,
  getArticles,
  deleteCategory,
} from "../../services";

export default function Categories() {
  const [categories, setCategories] = useState([]);
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
        const [catData, brandData, articleData] = await Promise.all([
          getCategories(),
          getBrands(),
          getArticles(),
        ]);

        if (ignore) return;

        setCategories(catData);
        setBrands(brandData);

        // Tally article counts per category client-side (the categories
        // endpoint doesn't include the articles relation).
        const counts = {};
        articleData.forEach((a) => {
          if (a.categoryId) counts[a.categoryId] = (counts[a.categoryId] || 0) + 1;
        });
        setArticleCounts(counts);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, []);

  const { query, setQuery, filteredData } = useSearch(categories, ["name"]);

  // GROUP CATEGORY BY BRAND
  const groupedCategories = brands.map((brand) => ({
    ...brand,
    categories: filteredData.filter((c) => c.brandId === brand.id),
  }));

  // DELETE
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteCategory(deleteTarget.id);

      const updated = categories.filter((c) => c.id !== deleteTarget.id);

      setCategories(updated);

      setToast({
        show: true,
        type: "success",
        message: "Category deleted",
      });

      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const editSuccess = () => {
    setEditTarget(null);

    setToast({ show: true, type: "success", message: "Category updated" });

    getCategories().then(setCategories);
  };

  const columns = [
    { key: "id", label: "#" },

    {
      key: "name",
      label: "Category",
      render: (row) => (
        <span className="flex items-center gap-2 font-medium">
          <img
            src="/icons/categories.png"
            alt=""
            className="w-5 h-5 object-contain"
          />
          {row.name}
        </span>
      ),
    },

    { key: "slug", label: "Slug" },

    {
      key: "articles",
      label: "Articles",
      render: (row) => articleCounts[row.id] ?? 0,
    },

    {
      key: "status",
      label: "Status",
      render: () => (
        <span className="os-status-pill os-status-active">Active</span>
      ),
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
            aria-label="Edit category"
          >
            <Pencil size={14} />
          </button>

          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="Delete category"
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
    return <div className="text-sm opacity-70">Loading categories...</div>;
  }

  return (
    <div>
      {/* HEADER */}
      <PageHeader
        title="Categories"
        breadcrumb={[
          { label: "Dashboard", path: "/" },
          { label: "Categories" },
        ]}
        action={
          <button onClick={() => setOpenCreate(true)} className="os-btn-primary">
            + Create Category
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
        <EmptyState
          title="No Categories"
          description="Create your first category."
        />
      )}

      {/* CATEGORY BOARD */}
      {view === "grid" && filteredData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groupedCategories.map((brand) => (
            <div key={brand.id} className="os-card">
              <h2 className="font-semibold mb-3">{brand.name}</h2>

              <div className="flex flex-wrap gap-2">
                {brand.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="flex items-center gap-1.5 text-xs pl-3 pr-2 py-1.5 rounded-full bg-[var(--os-nav-hover)] hover:bg-[var(--os-nav-active)] transition-colors"
                  >
                    <img
                      src="/icons/categories.png"
                      alt=""
                      className="w-3.5 h-3.5 object-contain"
                    />
                    {cat.name}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(cat)}
                      aria-label={`Delete ${cat.name}`}
                      className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                {brand.categories.length === 0 && (
                  <span className="text-xs opacity-50">No categories</span>
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

      {/* CREATE CATEGORY POPUP */}
      <PopUp
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Create Category"
      >
        <CreateCategoryForm
          onSuccess={() => {
            setOpenCreate(false);

            setToast({
              show: true,
              type: "success",
              message: "Category created",
            });

            getCategories().then(setCategories);
          }}
        />
      </PopUp>

      {/* EDIT CATEGORY POPUP */}
      <PopUp
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Category"
      >
        {editTarget && (
          <CreateCategoryForm
            initialData={editTarget}
            onSuccess={editSuccess}
          />
        )}
      </PopUp>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Category"
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
