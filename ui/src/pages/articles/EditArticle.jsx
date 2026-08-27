import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import ArticleEditor from "../../components/editors/TipTapEditor";
import ArticlePopUpMedia from "./components/ArticlePopUpMedia";
import {
  getArticleById,
  updateArticle,
  getBrands,
  getCategories,
} from "../../services";
import Toast from "../../components/shared/feedback/Toast";
import UploadBox from "./components/UploadBox";
import InputTags from "./components/InputTags";
import CategorySelect from "./components/CategorySelect";
import BrandSelect from "./components/BrandSelect";
import PageHeader from "../../components/shared/layout/PageHeader";
import { slugify } from "../../utils/slugify";

export default function EditArticle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState("");

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [thumbnail, setThumbnail] = useState(null);
  const [coverImage, setCoverImage] = useState(null);

  const [tagInput, setTagInput] = useState("");
  const [mediaPopup, setMediaPopup] = useState(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    brandId: "",
    categoryId: "",
    excerpt: "",
    visibility: "Public",
    status: "Draft",
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
    tags: [],
  });

  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  /* FETCH ARTICLE */

  useEffect(() => {
    let ignore = false;

    const fetchArticle = async () => {
      setLoading(true);

      try {
        const article = await getArticleById(id);

        if (ignore) return;

        setForm({
          title: article.title || "",
          slug: article.slug || "",
          brandId: article.brandId ?? "",
          categoryId: article.categoryId ?? "",
          excerpt: article.excerpt || "",
          visibility: article.visibility || "Public",
          status: article.status || "Draft",
          seoTitle: article.seoTitle || "",
          seoDescription: article.seoDescription || "",
          canonicalUrl: article.canonicalUrl || "",
          // Backend returns tags as join rows ({ tagId, tag: { name } }) —
          // InputTags works with plain name strings.
          tags: (article.tags || []).map((t) => t.tag?.name).filter(Boolean),
        });

        setContent(article.content || "");

        if (article.thumbnail) setThumbnail({ url: article.thumbnail });
        if (article.coverImage) setCoverImage({ url: article.coverImage });
      } catch (err) {
        console.error(err);
        if (!ignore) setNotFound(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchArticle();

    return () => {
      ignore = true;
    };
  }, [id]);

  /* FETCH BRANDS */

  useEffect(() => {
    const fetchBrands = async () => {
      const res = await getBrands();
      setBrands(res);
    };

    fetchBrands();
  }, []);

  /* FETCH CATEGORIES */

  useEffect(() => {
    if (!form.brandId) return;

    const fetchCategories = async () => {
      const res = await getCategories();

      setCategories(res.filter((c) => c.brandId === Number(form.brandId)));
    };

    fetchCategories();
  }, [form.brandId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateReadingTime = (html) => {
    const words = html.replace(/<[^>]*>/g, "").split(/\s+/).length;

    return Math.ceil(words / 200);
  };

  const saveArticle = async (status) => {
    try {
      setSaving(true);

      const readingTime = calculateReadingTime(content);

      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),

        brandId: Number(form.brandId),
        categoryId: Number(form.categoryId),

        content,

        status,
        visibility: form.visibility,

        excerpt: form.excerpt || "",

        thumbnail: thumbnail?.url || "",
        coverImage: coverImage?.url || "",

        ...(readingTime && { readingTime }),

        seoTitle: form.seoTitle || "",
        seoDescription: form.seoDescription || "",
        canonicalUrl: form.canonicalUrl || "",

        // Always send `tags` on every update, even when empty. The
        // update() service only rebuilds tag relations when this key is
        // present at all — omitting it here would mean "leave tags alone",
        // and sending [] here is how the user removes every tag.
        tags: form.tags || [],
      };

      const updated = await updateArticle(id, payload);

      setToast({
        show: true,
        type: "success",
        message: "Article Updated Successfully!",
      });

      // Give the toast a beat to show before navigating away.
      setTimeout(() => {
        navigate(`/articles/${updated.slug}`);
      }, 600);
    } catch (error) {
      console.error(error.response?.data || error);

      setToast({
        show: true,
        type: "error",
        message: error.response?.data?.message || "Failed to update article",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm opacity-70">Loading article...</div>;
  }

  if (notFound) {
    return (
      <div className="text-sm opacity-70 text-center py-10">
        Article not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit Article"
        breadcrumb={[
          { label: "Dashboard", path: "/" },
          { label: "Articles", path: "/articles" },
          { label: "Edit" },
        ]}
      />

      <div className="grid grid-cols-[1fr_260px] gap-4">
        <div>
          <label className="os-label">
            Article Title <span className="text-red-600">*</span>
          </label>

          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Enter article title..."
            className="os-input"
          />
        </div>

        <div>
          <label className="os-label">
            Select Brand <span className="text-red-600">*</span>
          </label>

          <BrandSelect
            brands={brands}
            value={form.brandId}
            onChange={handleChange}
          />
        </div>
      </div>

      <div>
        <label className="os-label">
          Slug <span className="text-red-600">*</span>
        </label>

        <input
          name="slug"
          value={form.slug}
          onChange={handleChange}
          placeholder="Enter slug (URL friendly)"
          className="os-input"
        />

        <p className="text-xs opacity-60 mt-1">
          The slug is used in the article URL. Use lowercase letters,
          numbers, and hyphens.
        </p>
      </div>

      <div>
        <label className="os-label">Excerpt</label>

        <textarea
          name="excerpt"
          value={form.excerpt}
          onChange={handleChange}
          placeholder="Write a short excerpt for your article..."
          className="os-input"
          rows={3}
        />

        <p className="text-xs opacity-60 mt-1">
          A brief summary of the article (optional).
        </p>
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-6 min-h-[70vh]">
        <div className="flex flex-col gap-2">
          <label className="os-label">
            Content <span className="text-red-600">*</span>
          </label>

          <ArticleEditor content={content} setContent={setContent} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="os-card">
            <h3 className="font-semibold mb-3">Publish</h3>

            <div className="flex gap-2">
              <button
                disabled={saving}
                onClick={() => saveArticle("Draft")}
                className="os-btn-secondary flex-1 disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                disabled={saving}
                onClick={() => saveArticle("Published")}
                className="os-btn-primary flex-1 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Update & Publish"}
              </button>
            </div>
          </div>

          <div className="os-card">
            <h3 className="font-semibold mb-3">Taxonomy</h3>

            <label className="os-label">
              Category <span className="text-red-600">*</span>
            </label>
            <CategorySelect
              categories={categories}
              value={form.categoryId}
              onChange={handleChange}
            />
            <p className="text-xs opacity-60 mt-1 mb-3">
              Choose the primary category for this article.
            </p>

            <label className="os-label">Tags</label>
            <InputTags
              tags={form.tags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              setForm={setForm}
            />
            <p className="text-xs opacity-60 mt-1">
              Add relevant tags to help organize your article.
            </p>
          </div>

          <div className="os-card">
            <h3 className="font-semibold mb-1">Featured Image</h3>
            <p className="text-xs opacity-60 mb-3">
              Upload a thumbnail and cover image for your article.
            </p>

            <UploadBox
              label="Thumbnail"
              image={thumbnail}
              onClick={() => setMediaPopup("thumbnail")}
            />

            <UploadBox
              label="Cover Image"
              image={coverImage}
              onClick={() => setMediaPopup("cover")}
            />
          </div>

          <div className="os-card">
            <h3 className="font-semibold mb-3">SEO Settings</h3>

            <input
              name="seoTitle"
              value={form.seoTitle}
              onChange={handleChange}
              placeholder="SEO Title"
              className="os-input mb-2"
            />

            <textarea
              name="seoDescription"
              value={form.seoDescription}
              onChange={handleChange}
              placeholder="SEO Description"
              className="os-input mb-2"
              rows="3"
            />

            <input
              name="canonicalUrl"
              value={form.canonicalUrl}
              onChange={handleChange}
              placeholder="Canonical URL"
              className="os-input"
            />
          </div>
        </div>
      </div>

      {mediaPopup && (
        <ArticlePopUpMedia
          onClose={() => setMediaPopup(null)}
          onSelect={(media) => {
            if (mediaPopup === "thumbnail") setThumbnail(media);
            if (mediaPopup === "cover") setCoverImage(media);

            setMediaPopup(null);
          }}
        />
      )}

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}
