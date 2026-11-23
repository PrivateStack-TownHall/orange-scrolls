// Mirrors the API's upload rules (api/src/media/upload-validation.ts) so a
// bad file is rejected immediately instead of after a round trip.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");
export const UPLOAD_HINT = "PNG, JPEG, GIF or WebP, up to 5 MB.";

/** Returns an error message, or "" when the file is acceptable. */
export function validateImageFile(file) {
  if (!file) return "Choose a file first.";

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `Unsupported file type. Allowed: ${UPLOAD_HINT}`;
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`;
  }

  return "";
}
