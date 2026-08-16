import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";

import DataToolbar from "../../components/shared/ui/DataToolbar";
import DataTable from "../../components/shared/ui/DataTable";
import PageHeader from "../../components/shared/layout/PageHeader";
import BrandCard from "../../components/shared/ui/BrandCard";

import PopUp from "../../components/shared/feedback/PopUp";
import ConfirmDialog from "../../components/shared/feedback/ConfirmDialog";
import Toast from "../../components/shared/feedback/Toast";
import EmptyState from "../../components/shared/feedback/EmptyState";

import CreateBrandForm from "./CreateBrand";

import useSearch from "../../hooks/useSearch";

import {
  getBrands,
  getArticles,
  getCategories,
  getTags,
  getMedia,
  deleteBrand,
} from "../../services";

export default function Brands() {
  const [brands, setBrands] = useState([]);

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [media, setMedia] = useState([]);

  const [view, setView] = useState("grid");
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
        const [brandsData, articlesData, categoriesData, tagsData, mediaData] =
          await Promise.all([
            getBrands(),
            getArticles(),
            getCategories(),
            getTags(),
            getMedia(),
          ]);

        if (ignore) return;

        setBrands(brandsData);
        setArticles(articlesData);
        setCategories(categoriesData);
        setTags(tagsData);
        setMedia(mediaData);
      } catch (err) {
        console.error("Failed to fetch brands:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, []);

  const { query, setQuery, filteredData } = useSearch(brands, ["name"]);

  // DELETE BRAND
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteBrand(deleteTarget.id);

      const updated = brands.filter((b) => b.id !== deleteTarget.id);

      setBrands(updated);

      setToast({
        show: true,
        type: "success",
        message: "Brand deleted",
      });

      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const columns = [
    { key: "id", label: "#" },

    {
      key: "name",
      label: "Brand",
      render: (row) => (
        <span className="flex items-center gap-2 font-medium">
          <img
            src={row.logoImage || "/icons/shield_feather.png"}
            alt=""
            className="w-6 h-6 object-contain"
          />
          {row.name}
        </span>
      ),
    },

    {
      key: "articles",
      label: "Articles",
      render: (row) => articles.filter((a) => a.brandId === row.id).length,
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
          <Link
            to={`/brands/${row.id}/edit`}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)] inline-flex"
            aria-label="Edit brand"
          >
            <Pencil size={14} />
          </Link>

          <button
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded border border-[var(--os-border-soft)] hover:bg-[var(--os-nav-hover)]"
            aria-label="Delete brand"
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
    return <div className="text-sm opacity-70">Loading brands...</div>;
  }

  return (
    <div>
      {/* HEADER */}

      <PageHeader
        title="Brands"
        breadcrumb={[{ label: "Dashboard", path: "/" }, { label: "Brands" }]}
        action={
          <button onClick={() => setOpenCreate(true)} className="os-btn-primary">
            + Create Brand
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
        <EmptyState title="No Brands" description="Create your first brand." />
      )}

      {/* CARD VIEW */}
      {view === "grid" && filteredData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredData.map((brand) => {
            const articleCount = articles.filter(
              (a) => a.brandId === brand.id,
            ).length;

            const categoryCount = categories.filter(
              (c) => c.brandId === brand.id,
            ).length;

            const tagCount = tags.filter((t) => t.brandId === brand.id).length;

            const mediaCount = media.filter(
              (m) => m.brandId === brand.id,
            ).length;

            return (
              <BrandCard
                key={brand.id}
                brand={brand}
                articleCount={articleCount}
                categoryCount={categoryCount}
                tagCount={tagCount}
                mediaCount={mediaCount}
                onDelete={(brand) => setDeleteTarget(brand)}
              />
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}

      {view === "table" && filteredData.length > 0 && (
        <div className="os-card">
          <DataTable columns={columns} data={filteredData} />
        </div>
      )}

      {/* CREATE BRAND POPUP */}

      <PopUp
        isOpen={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Create Brand"
      >
        <CreateBrandForm
          onSuccess={() => {
            setOpenCreate(false);

            setToast({
              show: true,
              type: "success",
              message: "Brand created",
            });

            getBrands().then(setBrands);
          }}
        />
      </PopUp>

      {/* CONFIRM DELETE */}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Brand"
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
