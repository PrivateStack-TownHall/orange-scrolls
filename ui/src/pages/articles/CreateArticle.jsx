import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ArticleEditor from "../../components/editors/TipTapEditor";
import ArticlePopUpMedia from "./components/ArticlePopUpMedia";
import { createArticle, getBrands, getCategories } from "../../services";
import Toast from "../../components/shared/feedback/Toast";
import UploadBox from "./components/UploadBox";
import InputTags from "./components/InputTags";
import CategorySelect from "./components/CategorySelect";
import BrandSelect from "./components/BrandSelect";
import FieldError from "./components/FieldError";
import GalleryField from "./components/GalleryField";
import PublishSettings from "./components/PublishSettings";
import PageHeader from "../../components/shared/layout/PageHeader";
import { slugify } from "../../utils/slugify";
import {
  buildMediaPayload,
  calculateReadingTime,
  focusFirstInvalid,
  fieldProps,
  fromLocalInput,
  invalidClass,
  mapApiError,
  readRememberedAuthor,
  rememberAuthor,
  validateArticleForm,
} from "./articleForm";

export default function CreateArticle() {
  const navigate = useNavigate();
  const [content, setContent] = useState("");

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [thumbnail, setThumbnail] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [gallery, setGallery] = useState([]);

  const [tagInput, setTagInput] = useState("");
  const [mediaPopup, setMediaPopup] = useState(null);

  const [form, setForm] = useState(() => ({
    title: "",
    slug: "",
    brandId: "",
    categoryId: "",
    // No auth yet: author is an explicit field, pre-filled with the last
    // value used in this browser (never a hardcoded name).
    author: readRememberedAuthor(),
    excerpt: "",
    visibility: "Public",
    status: "Draft",
    publishedAt: "",
    scheduledAt: "",
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
    tags: [],
  }));

  // field -> message, from client validation and from the API
  const [errors, setErrors] = useState({});

  // Saving state: `saving` drives the UI, the ref blocks a second submit
  // that fires before React has re-rendered (double click, Enter + click).
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(null);
  const savingRef = useRef(false);
  const redirectTimer = useRef(null);

  // Once the person edits the slug directly, stop overwriting it when the
  // title changes — respect their manual override.
  const [slugTouched, setSlugTouched] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

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

  const clearError = (name) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const handleChange = (e) => {
    const { name, value } = e.target;

    clearError(name);

    if (name === "slug") {
      setSlugTouched(true);
      setForm((prev) => ({ ...prev, slug: value }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
      // A category belongs to one brand: changing the brand invalidates it.
      ...(name === "brandId" ? { categoryId: "" } : {}),
      // Auto-fill the slug as the title is typed, unless the person has
      // already edited the slug field directly.
      ...(name === "title" && !slugTouched ? { slug: slugify(value) } : {}),
    }));

    if (name === "title" && !slugTouched) clearError("slug");
    if (name === "brandId") clearError("categoryId");
  };

  const handleContentChange = (value) => {
    setContent(value);
    // The editor keeps the callback it was created with, so don't read
    // `errors` here — clearError uses a functional update and is safe.
    clearError("content");
  };

  const saveArticle = async (status) => {
    if (savingRef.current) return;

    const found = validateArticleForm({ form, content, status });

    if (Object.keys(found).length) {
      setErrors(found);
      setToast({
        show: true,
        type: "error",
        message: "Please fix the highlighted fields.",
      });
      focusFirstInvalid();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setSavingStatus(status);
    setErrors({});

    try {
      const readingTime = calculateReadingTime(content);
      const media = buildMediaPayload({ thumbnail, coverImage, gallery });
      const publishedAt = fromLocalInput(form.publishedAt);
      const scheduledAt = fromLocalInput(form.scheduledAt);

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),

        brandId: Number(form.brandId),
        categoryId: Number(form.categoryId),

        content,
        author: form.author.trim(),

        status,
        visibility: form.visibility,

        ...(form.excerpt && { excerpt: form.excerpt }),

        ...(thumbnail?.url && { thumbnail: thumbnail.url }),
        ...(coverImage?.url && { coverImage: coverImage.url }),
        ...(media.length && { media }),

        ...(publishedAt && { publishedAt }),
        ...(scheduledAt && { scheduledAt }),

        readingTime,

        ...(form.seoTitle && { seoTitle: form.seoTitle }),
        ...(form.seoDescription && { seoDescription: form.seoDescription }),
        ...(form.canonicalUrl && { canonicalUrl: form.canonicalUrl }),

        ...(form.tags?.length && { tags: form.tags }),
      };

      // The page reports errors itself (inline + toast), so skip the global
      // error modal to avoid showing the same failure twice.
      await createArticle(payload, { skipErrorModal: true });

      rememberAuthor(form.author.trim());

      setToast({
        show: true,
        type: "success",
        message: "Article Saved Successfully!",
      });

      // Stay in the saving state until we leave the page so the buttons
      // can't be clicked again while the redirect is pending.
      redirectTimer.current = setTimeout(() => {
        navigate("/articles");
      }, 600);
    } catch (error) {
      console.error(error.response?.data || error);

      const { fieldErrors, general } = mapApiError(
        error,
        "Failed to save article",
      );

      setErrors(fieldErrors);
      setToast({ show: true, type: "error", message: general });
      if (Object.keys(fieldErrors).length) focusFirstInvalid();

      savingRef.current = false;
      setSaving(false);
      setSavingStatus(null);
    }
  };

  const removeGallery = (id) =>
    setGallery((prev) => prev.filter((g) => g.id !== id));

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
          <label htmlFor="title" className="os-label">
            Article Title <span className="text-red-600">*</span>
          </label>

          <input
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Enter article title..."
            className={`os-input${invalidClass("title", errors)}`}
            {...fieldProps("title", errors)}
          />
          <FieldError id="title-error" message={errors.title} />
        </div>

        <div>
          <label htmlFor="brandId" className="os-label">
            Select Brand <span className="text-red-600">*</span>
          </label>

          <BrandSelect
            brands={brands}
            value={form.brandId}
            onChange={handleChange}
            invalid={!!errors.brandId}
          />
          <FieldError id="brandId-error" message={errors.brandId} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-4">
        <div>
          <label htmlFor="slug" className="os-label">
            Slug <span className="text-red-600">*</span>
          </label>

          <input
            id="slug"
            name="slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="Enter slug (URL friendly)"
            className={`os-input${invalidClass("slug", errors)}`}
            {...fieldProps("slug", errors)}
          />

          <p className="text-xs opacity-60 mt-1">
            The slug is used in the article URL. Use lowercase letters,
            numbers, and hyphens.
          </p>
          <FieldError id="slug-error" message={errors.slug} />
        </div>

        <div>
          <label htmlFor="author" className="os-label">
            Author <span className="text-red-600">*</span>
          </label>

          <input
            id="author"
            name="author"
            value={form.author}
            onChange={handleChange}
            placeholder="Who wrote this?"
            autoComplete="name"
            className={`os-input${invalidClass("author", errors)}`}
            {...fieldProps("author", errors)}
          />
          <FieldError id="author-error" message={errors.author} />
        </div>
      </div>

      <div>
        <label htmlFor="excerpt" className="os-label">
          Excerpt
        </label>

        <textarea
          id="excerpt"
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

          <ArticleEditor content={content} setContent={handleContentChange} />
          <FieldError id="content-error" message={errors.content} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="os-card">
            <h3 className="font-semibold mb-3">Publish</h3>

            <PublishSettings
              form={form}
              errors={errors}
              onChange={handleChange}
            />

            <FieldError id="status-error" message={errors.status} />

            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                aria-busy={saving && savingStatus === "Draft"}
                onClick={() => saveArticle("Draft")}
                className="os-btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && savingStatus === "Draft" ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                disabled={saving}
                aria-busy={saving && savingStatus === "Published"}
                onClick={() => saveArticle("Published")}
                className="os-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && savingStatus === "Published" ? "Saving..." : "Publish"}
              </button>
            </div>
          </div>

          <div className="os-card">
            <h3 className="font-semibold mb-3">Taxonomy</h3>

            <label htmlFor="categoryId" className="os-label">
              Category <span className="text-red-600">*</span>
            </label>
            <CategorySelect
              categories={categories}
              value={form.categoryId}
              onChange={handleChange}
              invalid={!!errors.categoryId}
            />
            <FieldError id="categoryId-error" message={errors.categoryId} />
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
              onRemove={() => setThumbnail(null)}
            />

            <UploadBox
              label="Cover Image"
              image={coverImage}
              onClick={() => setMediaPopup("cover")}
              onRemove={() => setCoverImage(null)}
            />

            <GalleryField
              items={gallery}
              onAdd={() => setMediaPopup("gallery")}
              onRemove={removeGallery}
              error={errors.media}
            />
          </div>

          <div className="os-card">
            <h3 className="font-semibold mb-3">SEO Settings</h3>

            <input
              name="seoTitle"
              value={form.seoTitle}
              onChange={handleChange}
              placeholder="SEO Title"
              aria-label="SEO Title"
              className="os-input mb-2"
            />

            <textarea
              name="seoDescription"
              value={form.seoDescription}
              onChange={handleChange}
              placeholder="SEO Description"
              aria-label="SEO Description"
              className="os-input mb-2"
              rows="3"
            />

            <input
              name="canonicalUrl"
              value={form.canonicalUrl}
              onChange={handleChange}
              placeholder="Canonical URL"
              aria-label="Canonical URL"
              className="os-input"
            />
          </div>
        </div>
      </div>

      {mediaPopup && (
        <ArticlePopUpMedia
          title={
            mediaPopup === "thumbnail"
              ? "Select thumbnail"
              : mediaPopup === "cover"
                ? "Select cover image"
                : "Add gallery image"
          }
          onClose={() => setMediaPopup(null)}
          onSelect={(media) => {
            if (mediaPopup === "thumbnail") setThumbnail(media);
            if (mediaPopup === "cover") setCoverImage(media);
            if (mediaPopup === "gallery")
              setGallery((prev) =>
                prev.some((g) => g.id === media.id) ? prev : [...prev, media],
              );

            clearError("media");
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
