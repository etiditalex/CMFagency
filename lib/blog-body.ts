/**
 * Blog / news body → safe HTML:
 * - ## Subtitle → h2, ### → h3
 * - **bold**, *italic* (single asterisks; ** processed first)
 * - [visible text](https://url) — e.g. [click here](https://…) without showing the raw URL
 * - Bare https://… in prose → link
 * - ![Caption below image](https://image.jpg) on its own line → figure + caption (news-style)
 * - Paragraphs: comfortable line height for reading
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
const PLACEHOLDER_ITALIC = "\uFEFF\uFEFFI";

/** Inline: [text](url), **bold**, *italic*, bare URLs. */
function processInline(raw: string): string {
  const replacements: string[] = [];
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
  const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, (_, inner) => {
    const idx = replacements.length;
    replacements.push(`<strong class="font-bold">${escapeHtml(inner)}</strong>`);
    return `${PLACEHOLDER_BOLD}${idx}\uFEFF`;
  });
  const withItalic = withBold.replace(/\*(?!\*)([^*]+?)\*(?!\*)/g, (full, inner: string) => {
    if (!inner.trim()) return full;
    const idx = replacements.length;
    replacements.push(`<em class="italic text-gray-800">${escapeHtml(inner)}</em>`);
    return `${PLACEHOLDER_ITALIC}${idx}\uFEFF`;
  });
  const withBareUrls = withItalic.replace(/\b(https?:\/\/[^\s<>\[\]"']+)/gi, (full) => {
    const { href, tail } = splitUrlAndTrailingPunct(full);
    if (!isSafeUrl(href)) return full;
    const idx = replacements.length;
    const display = href.length > 52 ? `${href.slice(0, 49)}…` : href;
    replacements.push(
      `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-primary-600 font-semibold hover:underline break-all">${escapeHtml(display)}</a>`
    );
    return `${PLACEHOLDER_LINK}${idx}\uFEFF${tail}`;
  });
  let out = escapeHtml(withBareUrls);
  replacements.forEach((html, i) => {
    out = out
      .replace(`${PLACEHOLDER_LINK}${i}\uFEFF`, html)
      .replace(`${PLACEHOLDER_BOLD}${i}\uFEFF`, html)
      .replace(`${PLACEHOLDER_ITALIC}${i}\uFEFF`, html);
  });
  return out;
}

const H2_CLASS = "font-bold text-xl md:text-2xl text-gray-900 mt-10 mb-3";
const H3_CLASS = "font-bold text-lg md:text-xl text-gray-900 mt-8 mb-3";
const P_CLASS =
  "text-gray-800 text-[1.0625rem] sm:text-lg leading-[1.85] mb-6 [word-spacing:0.02em]";

/**
 * Markdown-like body → HTML for article view.
 */
export function renderBlogBodyToHtml(body: string | null | undefined): string {
  if (!body || typeof body !== "string") return "";
  const lines = body.split(/\r?\n/);
  const blocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const trimmedEnd = line.trimEnd();

    const standaloneImg = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*$/);
    if (standaloneImg) {
      const capRaw = standaloneImg[1].trim();
      const url = standaloneImg[2].trim();
      if (isSafeUrl(url)) {
        const alt = capRaw || "Article image";
        const figcaption = capRaw
          ? `<figcaption class="mt-3 text-sm sm:text-base text-gray-600 leading-[1.75] border-l-4 border-primary-200 pl-3 not-italic">${processInline(capRaw)}</figcaption>`
          : "";
        blocks.push(
          `<figure class="my-8 not-prose max-w-full"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" class="w-full rounded-xl border border-gray-100 shadow-md object-contain max-h-[min(560px,70vh)] mx-auto bg-gray-50" loading="lazy" decoding="async" referrerpolicy="no-referrer-when-downgrade" />${figcaption}</figure>`
        );
        i += 1;
        continue;
      }
    }

    if (trimmedEnd.startsWith("### ")) {
      blocks.push(`<h3 class="${H3_CLASS}">${processInline(trimmedEnd.slice(4))}</h3>`);
      i += 1;
      continue;
    }
    if (trimmedEnd.startsWith("## ")) {
      blocks.push(`<h2 class="${H2_CLASS}">${processInline(trimmedEnd.slice(3))}</h2>`);
      i += 1;
      continue;
    }

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
      if (ln.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*$/)) break;
      if (ln.startsWith("## ") || ln.startsWith("### ")) break;
      paraLines.push(ln);
      i += 1;
    }
    if (paraLines.length > 0) {
      const text = paraLines.join(" ");
      blocks.push(`<p class="${P_CLASS}">${processInline(text)}</p>`);
    }
  }

  return blocks.join("\n");
}

export type ExternalLink = { label: string; url: string };
