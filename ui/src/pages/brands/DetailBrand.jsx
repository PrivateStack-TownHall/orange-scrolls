import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, FolderOpen, Image as ImageIcon } from "lucide-react";

import PopUp from "../../components/shared/feedback/PopUp";
import Badge from "../../components/shared/ui/Badge";
import EmptyState from "../../components/shared/feedback/EmptyState";

import CreateCategoryForm from "../categories/CreateCategory";
import CreateTagForm from "../tags/CreateTag";
import UploadMediaForm from "../media/UploadMedia";
import Toast from "../../components/shared/feedback/Toast";

import {
  getArticles,
  getCategories,
  getTags,
  getMedia,
  getBrandById,
} from "../../services";

export default function DetailBrand() {
  const id = +useParams().id;

  const [brand, setBrand] = useState(null);

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [media, setMedia] = useState([]);

  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const [selectedImage, setSelectedImage] = useState(null);

  const [openCategory, setOpenCategory] = useState(false);
  const [openTag, setOpenTag] = useState(false);
  const [openMedia, setOpenMedia] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      const [brandData, articlesData, categoriesData, tagsData, mediaData] =
        await Promise.all([
          getBrandById(id),
          getArticles(),
          getCategories(),
          getTags(),
          getMedia(),
        ]);

      if (ignore) return;

      setBrand(brandData);

      setArticles(articlesData.filter((a) => a.brandId === id));
      setCategories(categoriesData.filter((c) => c.brandId === id));
      setTags(tagsData.filter((t) => t.brandId === id));
      setMedia(mediaData.filter((m) => m.brandId === id));
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [id]);

  if (!brand) {
    return <div className="text-sm opacity-70">Loading brand...</div>;
  }

  const createCategorySuccess = () => {
    setOpenCategory(false);
    setToast({
      show: true,
      type: "success",
      message: "Category created",
    });
  };

  const createTagSuccess = () => {
    setOpenTag(false);
    setToast({
      show: true,
      type: "success",
      message: "Tag created",
    });
  };

  const uploadMediaSuccess = () => {
    setOpenMedia(false);
    setToast({
      show: true,
      type: "success",
      message: "Media uploaded",
    });
  };

  const published = articles.filter((a) => a.status === "Published");
  const drafts = articles.filter((a) => a.status === "Draft");

  return (
    <div className="space-y-8">
      {/* HEADER */}

      <div className="os-card flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in-fade">
        <div className="flex items-center gap-4">
          {/* BRAND ICON (uses the shared widget illustration — per-brand
              logo assets aren't available yet) */}

          <img
            src="/icons/brands.png"
            alt=""
            aria-hidden="true"
            className="w-14 h-14 object-contain shrink-0"
          />

          <div>
            <p className="text-xs uppercase tracking-wide opacity-60 mb-1">
              Brand
            </p>
            <h1 className="text-3xl font-bold">{brand.name}</h1>
            <p className="text-sm opacity-70">Brand dashboard overview</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}

        <div className="flex flex-wrap gap-2">
          <Link to="/articles/create" className="os-btn-primary">
            + Create Article
          </Link>

          <button
            onClick={() => setOpenCategory(true)}
            className="os-btn-outline"
          >
            + Create Category
          </button>

          <button onClick={() => setOpenTag(true)} className="os-btn-outline">
            + Create Tag
          </button>

          <button onClick={() => setOpenMedia(true)} className="os-btn-outline">
            + Upload Media
          </button>
        </div>
      </div>

      {/* STATS STRIP */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Articles", value: articles.length, icon: "/icons/articles.png" },
          { label: "Categories", value: categories.length, icon: "/icons/categories.png" },
          { label: "Tags", value: tags.length, icon: "/icons/tags.png" },
          { label: "Media", value: media.length, icon: "/icons/media.png" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="os-card os-hover-lift flex items-center gap-3"
          >
            <img
              src={stat.icon}
              alt=""
              aria-hidden="true"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div>
              <div className="text-2xl font-bold leading-none">
                {stat.value}
              </div>
              <div className="text-xs opacity-70">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ARTICLES */}

      <div className="os-card">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="opacity-70" />
          <h2 className="font-semibold text-lg">Articles</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* PUBLISHED */}

          <div>
            <h3 className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-3">
              Published
            </h3>

            <div className="flex flex-col gap-2">
              {published.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  className="flex items-center justify-between gap-3 text-sm border-b border-[var(--os-border-soft)] pb-2 hover:text-[var(--os-primary)] transition-colors"
                >
                  <span className="truncate">{article.title}</span>
                  <Badge status="Published" label="" size="sm" />
                </Link>
              ))}

              {published.length === 0 && (
                <p className="text-sm opacity-60">No published articles</p>
              )}
            </div>
          </div>

          {/* DRAFT */}

          <div>
            <h3 className="text-xs uppercase tracking-wide font-semibold opacity-60 mb-3">
              Draft
            </h3>

            <div className="flex flex-col gap-2">
              {drafts.map((article) => (
                <Link
                  key={article.id}
                  to={`/articles/${article.slug}`}
                  className="flex items-center justify-between gap-3 text-sm border-b border-[var(--os-border-soft)] pb-2 opacity-80 hover:opacity-100 hover:text-[var(--os-primary)] transition-colors"
                >
                  <span className="truncate">{article.title}</span>
                  <Badge status="Draft" label="" size="sm" />
                </Link>
              ))}

              {drafts.length === 0 && (
                <p className="text-sm opacity-60">No draft articles</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TAXONOMY */}

      <div className="grid md:grid-cols-2 gap-6">
        {/* CATEGORIES */}

        <div className="os-card">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen size={18} className="opacity-70" />
            <h2 className="font-semibold">Categories</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat.id}
                className="px-3 py-1 text-xs rounded bg-[var(--os-nav-hover)] border border-[var(--os-border-soft)]"
              >
                {cat.name}
              </span>
            ))}

            {categories.length === 0 && (
              <p className="text-sm opacity-60">No categories yet</p>
            )}
          </div>
        </div>

        {/* TAGS */}

        <div className="os-card">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="opacity-70" />
            <h2 className="font-semibold">Tags</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 text-xs rounded bg-[var(--os-nav-hover)] border border-[var(--os-border-soft)]"
              >
                #{tag.name}
              </span>
            ))}

            {tags.length === 0 && (
              <p className="text-sm opacity-60">No tags yet</p>
            )}
          </div>
        </div>
      </div>

      {/* MEDIA */}

      <div className="os-card">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="opacity-70" />
          <h2 className="font-semibold">Media</h2>
        </div>

        {media.length === 0 ? (
          <EmptyState
            title="No media yet"
            description="Upload an image to get started."
          />
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {media.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedImage(img.url)}
                className="os-card-compact os-hover-lift overflow-hidden"
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-20 object-cover rounded"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* IMAGE POPUP */}

      <PopUp
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        title="Media Preview"
      >
        {selectedImage && (
          <img src={selectedImage} className="w-full rounded" />
        )}
      </PopUp>

      {/* CREATE CATEGORY POPUP */}

      <PopUp
        isOpen={openCategory}
        onClose={() => setOpenCategory(false)}
        title="Create Category"
      >
        <CreateCategoryForm brandId={id} onSuccess={createCategorySuccess} />
      </PopUp>

      {/* CREATE TAG POPUP */}

      <PopUp
        isOpen={openTag}
        onClose={() => setOpenTag(false)}
        title="Create Tag"
      >
        <CreateTagForm brandId={id} onSuccess={createTagSuccess} />
      </PopUp>

      {/* UPLOAD MEDIA POPUP */}

      <PopUp
        isOpen={openMedia}
        onClose={() => setOpenMedia(false)}
        title="Upload Media"
      >
        <UploadMediaForm brandId={id} onSuccess={uploadMediaSuccess} />
      </PopUp>

      {/* TOAST */}

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            show: false,
          }))
        }
      />
    </div>
  );
}
