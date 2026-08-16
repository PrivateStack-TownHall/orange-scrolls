/**
 * Convert a title into a URL-safe slug.
 *
 * Handles diacritics (e.g. "café" -> "cafe"), collapses whitespace/
 * repeated separators into a single hyphen, and trims leading/trailing
 * hyphens. This is the single source of truth for slug generation —
 * import it instead of writing a local version in a page/component.
 *
 * @example
 * slugify("Café & Résumé!  Tips") // "cafe-resume-tips"
 */
export function slugify(title) {
  if (!title) return "";

  return title
    .toString()
    .normalize("NFKD") // split accented chars into base + diacritic
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // drop anything that isn't alphanumeric/space/hyphen
    .replace(/[\s_-]+/g, "-") // collapse whitespace/underscores/hyphens into one hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

export default slugify;
