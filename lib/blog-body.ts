/**
 * Simple blog body parser for SEO-friendly output:
 * - ## Subtitle -> <h2> (bold)
 * - ### Subheading -> <h3> (bold)
 * - **text** -> <strong>
 * - [label](url) -> outbound link; only http(s) URLs allowed
 * - Bare https:// or http:// in text -> clickable link (after markdown links are parsed)
 * - Paragraphs preserved
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSafeUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://");
}

/** Strip trailing punctuation often pasted after URLs (keeps href clean). */
function splitUrlAndTrailingPunct(raw: string): { href: string; tail: string } {
  const punctEnd = /[.,;:!?)\]'"\u201d\u2019]+$/;
  let href = raw;
  while (punctEnd.test(href)) {
    href = href.replace(punctEnd, "");
  }
  return { href, tail: raw.slice(href.length) };
}

const PLACEHOLDER_LINK = "\uFEFF\uFEFFL";
const PLACEHOLDER_BOLD = "\uFEFF\uFEFFB";

/** Process inline elements: [text](url), **bold**, bare http(s) URLs. Outputs safe HTML. */
function processInline(raw: string): string {
  const replacements: string[] = [];
  // Replace [text](url) with placeholder; store safe <a> in replacements
  const withLinks = raw.replace(
    /\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi,
    (_, label: string, url: string) => {
      if (!isSafeUrl(url)) return escapeHtml(_);
      const idx = replacements.length;
      replacements.push(
        `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-primary-600 font-semibold hover:underline">${escapeHtml(label)}</a>`
      );
      return `${PLACEHOLDER_LINK}${idx}\uFEFF`;
    }
  );
  // Replace **bold** with placeholder
  const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, (_, inner) => {
    const idx = replacements.length;
    replacements.push(`<strong class="font-bold">${escapeHtml(inner)}</strong>`);
    return `${PLACEHOLDER_BOLD}${idx}\uFEFF`;
  });
  // Bare URLs (not already markdown); trim trailing .,)! etc. from href
  const withBareUrls = withBold.replace(/\b(https?:\/\/[^\s<>\[\]"']+)/gi, (full) => {
    const { href, tail } = splitUrlAndTrailingPunct(full);
    if (!isSafeUrl(href)) return full;
    const idx = replacements.length;
    const display = href.length > 52 ? `${href.slice(0, 49)}…` : href;
    replacements.push(
      `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-primary-600 font-semibold hover:underline break-all">${escapeHtml(display)}</a>`
    );
    return `${PLACEHOLDER_LINK}${idx}\uFEFF${tail}`;
  });
  // Escape remaining content
  let out = escapeHtml(withBareUrls);
  // Restore placeholders (indices are safe: 0,1,2,...)
  replacements.forEach((html, i) => {
    out = out.replace(`${PLACEHOLDER_LINK}${i}\uFEFF`, html).replace(`${PLACEHOLDER_BOLD}${i}\uFEFF`, html);
  });
  return out;
}

const H2_CLASS = "font-bold text-xl md:text-2xl text-gray-900 mt-8 mb-2";
const H3_CLASS = "font-bold text-lg md:text-xl text-gray-900 mt-6 mb-2";

/**
 * Convert plain body text with simple markdown to safe HTML.
 * Use in blog post view with dangerouslySetInnerHTML inside a container that has prose styles.
 */
export function renderBlogBodyToHtml(body: string | null | undefined): string {
  if (!body || typeof body !== "string") return "";
  const lines = body.split(/\r?\n/);
  const blocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trimEnd();
    if (trimmed.startsWith("### ")) {
      blocks.push(`<h3 class="${H3_CLASS}">${processInline(trimmed.slice(4))}</h3>`);
      i += 1;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(`<h2 class="${H2_CLASS}">${processInline(trimmed.slice(3))}</h2>`);
      i += 1;
      continue;
    }
    // Paragraph: collect consecutive non-empty lines (or single empty as paragraph break)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const ln = lines[i];
      if (ln.trimStart() === "" && paraLines.length > 0) {
        i += 1;
        break;
      }
      if (ln.trimStart() === "") {
        if (paraLines.length > 0) break;
        i += 1;
        continue;
      }
      if (ln.startsWith("## ") || ln.startsWith("### ")) break;
      paraLines.push(ln);
      i += 1;
    }
    if (paraLines.length > 0) {
      const text = paraLines.join(" ");
      blocks.push(`<p class="text-gray-700 leading-relaxed mb-4">${processInline(text)}</p>`);
    }
  }

  return blocks.join("\n");
}

export type ExternalLink = { label: string; url: string };
