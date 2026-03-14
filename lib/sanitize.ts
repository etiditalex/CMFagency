/**
 * Server-side input sanitization to reduce XSS risk when storing user content.
 * For plain-text fields we strip HTML tags and limit length.
 * When rendering user content as HTML, prefer escaping or use DOMPurify (e.g. isomorphic-dompurify).
 */

const MAX_LENGTH = 2000;
const HTML_TAG_REGEX = /<[^>]*>/g;

/**
 * Sanitize a string for safe storage: trim, strip HTML tags, limit length.
 */
export function sanitizeText(input: unknown): string {
  if (input == null) return "";
  const str = typeof input === "string" ? input : String(input);
  const trimmed = str.trim();
  const noTags = trimmed.replace(HTML_TAG_REGEX, "");
  return noTags.slice(0, MAX_LENGTH);
}

/**
 * Sanitize for use in HTML context (e.g. when re-rendering stored content).
 * Escapes & < > " '
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
