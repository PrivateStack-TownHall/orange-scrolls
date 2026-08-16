import { useState, useEffect } from "react";
import ArticleEditor from "../../components/editors/TipTapEditor";
import ArticlePopUpMedia from "./components/ArticlePopUpMedia";
import { createArticle, getBrands, getCategories } from "../../services";
import Toast from "../../components/shared/feedback/Toast";
import UploadBox from "./components/UploadBox";
import InputTags from "./components/InputTags";
import CategorySelect from "./components/CategorySelect";
import BrandSelect from "./components/BrandSelect";
import PageHeader from "../../components/shared/layout/PageHeader";
import { slugify } from "../../utils/slugify";

export default function CreateArticle() {
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

  // Once the person edits the slug directly, stop overwriting it when the
  // title changes — respect their manual override.
  const [slugTouched, setSlugTouched] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

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

    if (name === "slug") {
      setSlugTouched(true);
      setForm((prev) => ({ ...prev, slug: value }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Auto-fill the slug as the title is typed, unless the person has
      // already edited the slug field directly.
      ...(name === "title" && !slugTouched
        ? { slug: slugify(value) }
        : {}),
    }));
  };

  const calculateReadingTime = (html) => {
    const words = html.replace(/<[^>]*>/g, "").split(/\s+/).length;

    return Math.ceil(words / 200);
  };

  const saveArticle = async (status) => {
    try {
      const readingTime = calculateReadingTime(content);

      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),

        brandId: Number(form.brandId),
        categoryId: Number(form.categoryId),

        content,
        author: "Vincent Guizot",

        status,
        visibility: form.visibility,

        ...(form.excerpt && { excerpt: form.excerpt }),

        ...(thumbnail?.url && { thumbnail: thumbnail.url }),
        ...(coverImage?.url && { coverImage: coverImage.url }),

        ...(readingTime && { readingTime }),

        ...(form.seoTitle && { seoTitle: form.seoTitle }),
        ...(form.seoDescription && { seoDescription: form.seoDescription }),
        ...(form.canonicalUrl && { canonicalUrl: form.canonicalUrl }),

        ...(form.tags?.length && { tags: form.tags }),
      };

      console.log("payload:", payload);

      await createArticle(payload);

      setToast({
        show: true,
        type: "success",
        message: "Article Saved Successfully!",
      });

      // TODO: re-add redirect (e.g. useNavigate -> navigate("/articles"))
      // once the post-save flow is finalized.
    } catch (error) {
      console.error(error.response?.data || error);

      setToast({
        show: true,
        type: "error",
        message: error.response?.data?.message || "Failed to save article",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create New Article"
        breadcrumb={[
          { label: "Dashboard", path: "/" },
          { label: "Articles", path: "/articles" },
          { label: "Create" },
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
                onClick={() => saveArticle("Draft")}
                className="os-btn-secondary flex-1"
              >
                Save Draft
              </button>

              <button
                onClick={() => saveArticle("Published")}
                className="os-btn-primary flex-1"
              >
                Publish
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
