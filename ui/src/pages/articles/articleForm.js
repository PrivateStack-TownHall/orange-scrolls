// Shared helpers for CreateArticle / EditArticle: validation, API error ->
// field mapping, date conversion and the media payload.

export const ARTICLE_STATUSES = ["Draft", "Published", "Archived"];
export const ARTICLE_VISIBILITIES = ["Public", "Private"];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AUTHOR_KEY = "orange-scrolls:author";

/* ------------------------------------------------------------------ author
 * There is no authentication yet, so there is no "current user". Instead of
 * hardcoding a name, the author is an explicit, required form field that
 * remembers the last value used in this browser.
 */
export function readRememberedAuthor() {
  try {
    return localStorage.getItem(AUTHOR_KEY) || "";
  } catch {
    return "";
  }
}

export function rememberAuthor(author) {
  try {
    if (author) localStorage.setItem(AUTHOR_KEY, author);
  } catch {
    /* storage unavailable — remembering is only a convenience */
  }
}

/* ------------------------------------------------------------------- dates */

const pad = (n) => String(n).padStart(2, "0");

/** ISO string -> value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso) {
  if (!iso) return "";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO string, or null when empty/invalid. */
export function fromLocalInput(value) {
  if (!value) return null;

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ----------------------------------------------------------------- content */

const stripHtml = (html) =>
  (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();

// An article with only an image is still content.
export const hasContent = (html) =>
  stripHtml(html).length > 0 || /<img\b/i.test(html || "");

export const calculateReadingTime = (html) => {
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).length : 0;

  return Math.max(1, Math.ceil(words / 200));
};

/* -------------------------------------------------------------- validation */

/**
 * Returns `{ field: message }` — empty when the form can be submitted.
 * `status` is the status that the clicked button will save.
 */
export function validateArticleForm({ form, content, status }) {
  const errors = {};
  const now = Date.now();

  if (!form.title.trim()) errors.title = "Title is required.";

  const slug = form.slug.trim();
  if (!slug) errors.slug = "Slug is required.";
  else if (!SLUG_PATTERN.test(slug))
    errors.slug = "Use lowercase letters, numbers and single hyphens only.";

  if (!form.brandId) errors.brandId = "Select a brand.";
  if (!form.categoryId) errors.categoryId = "Select a category.";

  if (!form.author.trim()) errors.author = "Author is required.";

  if (!hasContent(content)) errors.content = "Content is required.";

  if (!ARTICLE_STATUSES.includes(status))
    errors.status = "Choose a valid status.";

  if (!ARTICLE_VISIBILITIES.includes(form.visibility))
    errors.visibility = "Choose a valid visibility.";

  const published = form.publishedAt ? new Date(form.publishedAt) : null;
  const scheduled = form.scheduledAt ? new Date(form.scheduledAt) : null;

  if (published && Number.isNaN(published.getTime()))
    errors.publishedAt = "Enter a valid date and time.";
  if (scheduled && Number.isNaN(scheduled.getTime()))
    errors.scheduledAt = "Enter a valid date and time.";

  if (status === "Published") {
    if (published && published.getTime() > now)
      errors.publishedAt = "A published article can't have a future publish date.";

    if (scheduled && scheduled.getTime() > now)
      errors.scheduledAt =
        "A future schedule means the article is not published yet. Save it as Draft, or clear this field to publish now.";
  }

  return errors;
}

/* ------------------------------------------------------------ API -> fields */

const FIELD_KEYS = [
  "title",
  "slug",
  "brandId",
  "categoryId",
  "content",
  "status",
  "visibility",
  "author",
  "publishedAt",
  "scheduledAt",
  "excerpt",
  "seoTitle",
  "seoDescription",
  "canonicalUrl",
  "media",
  "tags",
];

/**
 * Turns an axios error into `{ fieldErrors, general }`.
 * The API reports validation as "field: message | field: message" and
 * business rules as plain sentences; both are matched to a form field where
 * possible. Anything unmatched becomes the general message.
 */
export function mapApiError(error, fallback = "Something went wrong.") {
  if (!error?.response) {
    return {
      fieldErrors: {},
      general: "Couldn't reach the server. Is the API running?",
    };
  }

  const message = error.response.data?.message;
  const text = Array.isArray(message) ? message.join(" | ") : message;

  if (!text) return { fieldErrors: {}, general: fallback };

  const fieldErrors = {};

  // "title: should not be empty | slug: must be a string"
  for (const part of String(text).split(" | ")) {
    const m = part.match(/^(\w+):\s*(.+)$/);
    if (m && FIELD_KEYS.includes(m[1])) fieldErrors[m[1]] = m[2];
  }

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, general: "Please fix the highlighted fields." };
  }

  const rules = [
    [/slug already in use/i, "slug"],
    [/category does not belong|category not found/i, "categoryId"],
    [/brand not found/i, "brandId"],
    [/publishedAt/i, "publishedAt"],
    [/scheduledAt/i, "scheduledAt"],
    [/media not found|one thumbnail|one cover/i, "media"],
  ];

  for (const [pattern, field] of rules) {
    if (pattern.test(text)) {
      return {
        fieldErrors: { [field]: text },
        general: "Please fix the highlighted fields.",
      };
    }
  }

  const missing = String(text).match(/Missing required field\(s\): (.+)/);
  if (missing) {
    for (const key of missing[1].split(/,\s*/)) {
      if (FIELD_KEYS.includes(key)) fieldErrors[key] = "This field is required.";
    }
    if (Object.keys(fieldErrors).length) {
      return { fieldErrors, general: "Please fix the highlighted fields." };
    }
  }

  return { fieldErrors: {}, general: text };
}

/* ------------------------------------------------------------------- media */

/**
 * ArticleMedia relations for the API. Only media that exists in the library
 * (has an id) can be related; a legacy thumbnail/cover that is just a URL is
 * carried by the `thumbnail` / `coverImage` fields instead.
 */
export function buildMediaPayload({ thumbnail, coverImage, gallery = [] }) {
  const items = [];

  if (thumbnail?.id) items.push({ mediaId: thumbnail.id, type: "thumbnail" });
  if (coverImage?.id) items.push({ mediaId: coverImage.id, type: "cover" });

  const seen = new Set();
  for (const g of gallery) {
    if (!g?.id || seen.has(g.id)) continue;
    seen.add(g.id);
    items.push({ mediaId: g.id, type: "gallery" });
  }

  return items;
}

/** Focus the first field flagged invalid after errors render. */
export function focusFirstInvalid() {
  setTimeout(() => {
    document.querySelector('[aria-invalid="true"]')?.focus?.();
  }, 0);
}

/* ---------------------------------------------------------- input helpers */

/** Props that mark an input invalid and link it to its message. */
export const fieldProps = (name, errors) =>
  errors[name]
    ? { "aria-invalid": true, "aria-describedby": `${name}-error` }
    : {};

export const invalidClass = (name, errors) =>
  errors[name] ? " border-red-500" : "";
