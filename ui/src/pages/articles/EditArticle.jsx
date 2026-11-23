import { useState, useEffect, useRef } from "react";
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
import FieldError from "./components/FieldError";
import GalleryField from "./components/GalleryField";
import PublishSettings from "./components/PublishSettings";
import InputTags from "./components/InputTags";
import CategorySelect from "./components/CategorySelect";
import BrandSelect from "./components/BrandSelect";
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
  rememberAuthor,
  toLocalInput,
  validateArticleForm,
} from "./articleForm";

export default function EditArticle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState(null);
  const savingRef = useRef(false);
  const redirectTimer = useRef(null);
  const [errors, setErrors] = useState({});

  const [content, setContent] = useState("");

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);

  const [thumbnail, setThumbnail] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [gallery, setGallery] = useState([]);

  const [tagInput, setTagInput] = useState("");
  const [mediaPopup, setMediaPopup] = useState(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    brandId: "",
    categoryId: "",
    author: "",
    excerpt: "",
    visibility: "Public",
    status: "Draft",
    publishedAt: "",
    scheduledAt: "",
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
          author: article.author || "",
          excerpt: article.excerpt || "",
          visibility: article.visibility || "Public",
          status: article.status || "Draft",
          publishedAt: toLocalInput(article.publishedAt),
          scheduledAt: toLocalInput(article.scheduledAt),
          seoTitle: article.seoTitle || "",
          seoDescription: article.seoDescription || "",
          canonicalUrl: article.canonicalUrl || "",
          // Backend returns tags as join rows ({ tagId, tag: { name } }) —
          // InputTags works with plain name strings.
          tags: (article.tags || []).map((t) => t.tag?.name).filter(Boolean),
        });

        setContent(article.content || "");

        // Prefer the ArticleMedia relations (they carry the media id);
        // fall back to the legacy URL columns for older articles.
        const related = (type) =>
          (article.media || []).filter((m) => m.type === type && m.media);
        const asMedia = (m) => ({
          id: m.mediaId,
          url: m.media.url,
          name: m.media.name,
        });

        const thumb = related("thumbnail")[0];
        const cover = related("cover")[0];

        if (thumb) setThumbnail(asMedia(thumb));
        else if (article.thumbnail) setThumbnail({ url: article.thumbnail });

        if (cover) setCoverImage(asMedia(cover));
        else if (article.coverImage) setCoverImage({ url: article.coverImage });

        setGallery(related("gallery").map(asMedia));
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

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

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

    setForm((prev) => ({
      ...prev,
      [name]: value,
      // A category belongs to one brand: changing the brand invalidates it.
      ...(name === "brandId" ? { categoryId: "" } : {}),
    }));

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
      const publishedAt = fromLocalInput(form.publishedAt);

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),

        brandId: Number(form.brandId),
        categoryId: Number(form.categoryId),

        content,
        author: form.author.trim(),

        status,
        visibility: form.visibility,

        excerpt: form.excerpt || "",

        thumbnail: thumbnail?.url || "",
        coverImage: coverImage?.url || "",

        // Always send the full relation set, even when empty: the API only
        // touches ArticleMedia when this key is present, and [] is how the
        // person removes every image.
        media: buildMediaPayload({ thumbnail, coverImage, gallery }),

        // publishedAt is publication history: only ever sent when it has a
        // value, never blanked. scheduledAt null clears the schedule.
        ...(publishedAt && { publishedAt }),
        scheduledAt: fromLocalInput(form.scheduledAt),

        readingTime,

        seoTitle: form.seoTitle || "",
        seoDescription: form.seoDescription || "",
        canonicalUrl: form.canonicalUrl || "",

        // Always send `tags` on every update, even when empty. The
        // update() service only rebuilds tag relations when this key is
        // present at all — omitting it here would mean "leave tags alone",
        // and sending [] here is how the user removes every tag.
        tags: form.tags || [],
      };

      // The page reports errors itself (inline + toast), so skip the global
      // error modal to avoid showing the same failure twice.
      const updated = await updateArticle(id, payload, {
        skipErrorModal: true,
      });

      rememberAuthor(form.author.trim());

      setToast({
        show: true,
        type: "success",
        message: "Article Updated Successfully!",
      });

      // Stay in the saving state until we leave the page so the buttons
      // can't be clicked again while the redirect is pending.
      redirectTimer.current = setTimeout(() => {
        navigate(`/articles/${updated.slug}`);
      }, 600);
    } catch (error) {
      console.error(error.response?.data || error);

      const { fieldErrors, general } = mapApiError(
        error,
        "Failed to update article",
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
              publishedAtLocked
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
                {saving && savingStatus === "Draft"
                  ? "Saving..."
                  : "Save as Draft"}
              </button>

              <button
                type="button"
                disabled={saving}
                aria-busy={saving && savingStatus === "Published"}
                onClick={() => saveArticle("Published")}
                className="os-btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && savingStatus === "Published"
                  ? "Saving..."
                  : "Update & Publish"}
              </button>
            </div>

            {/* Archive keeps the article (and its publishedAt history) but
                takes it out of circulation. */}
            <button
              type="button"
              disabled={saving}
              aria-busy={saving && savingStatus === "Archived"}
              onClick={() => saveArticle("Archived")}
              className="os-btn-outline w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && savingStatus === "Archived"
                ? "Saving..."
                : "Save as Archived"}
            </button>
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
