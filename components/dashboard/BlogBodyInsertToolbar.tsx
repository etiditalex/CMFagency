"use client";

import { useEffect, useState } from "react";
import { BookMarked, ImagePlus, Link2, Megaphone } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  body: string;
  setBody: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** When editing, exclude current post from the related-articles picker. */
  excludeBlogId?: string;
};

function insertExternalLinkAtCursor(
  body: string,
  setBody: (v: string) => void,
  el: HTMLTextAreaElement | null,
  url: string,
  linkLabelFallback: string
): boolean {
  const urlTrim = url.trim();
  if (!isHttpUrl(urlTrim)) return false;
  if (!el) {
    const label = (linkLabelFallback.trim() || "link").replace(/\]/g, "");
    const snippet = `[${label}](${urlTrim})`;
    const gap = body.length > 0 && !body.endsWith("\n\n") ? (body.endsWith("\n") ? "\n" : "\n\n") : "";
    setBody(body + gap + snippet);
    return true;
  }
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const selected = body.slice(start, end);
  const label = (selected.trim() || linkLabelFallback.trim() || "link").replace(/\]/g, "");
  const snippet = `[${label}](${urlTrim})`;
  const prefix = body.slice(0, start);
  const suffix = body.slice(end);
  setBody(prefix + snippet + suffix);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + snippet.length;
    el.setSelectionRange(pos, pos);
  });
  return true;
}

function insertSnippet(
  body: string,
  setBody: (v: string) => void,
  el: HTMLTextAreaElement | null,
  snippet: string
) {
  if (!el) {
    const gap = body.length > 0 && !body.endsWith("\n\n") ? (body.endsWith("\n") ? "\n" : "\n\n") : "";
    setBody(body + gap + snippet);
    return;
  }
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const prefix = body.slice(0, start);
  const suffix = body.slice(end);
  const atStart = start === 0;
  const padStart =
    !atStart && !/\n\n$/.test(prefix) ? (prefix.endsWith("\n") ? "\n" : "\n\n") : "";
  const padEnd =
    suffix.length > 0 && !/^\n/.test(suffix) ? "\n\n" : suffix.length > 0 ? "" : "";
  const next = prefix + padStart + snippet + padEnd + suffix;
  setBody(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = (prefix + padStart + snippet + padEnd).length;
    el.setSelectionRange(pos, pos);
  });
}

function escapeMarkdownAlt(s: string): string {
  return s.replace(/[\[\]]/g, "").slice(0, 240);
}

function isHttpUrl(s: string): boolean {
  const t = s.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

export default function BlogBodyInsertToolbar({ body, setBody, textareaRef, excludeBlogId }: Props) {
  const [posts, setPosts] = useState<{ slug: string; title: string }[]>([]);
  const [selectedRelated, setSelectedRelated] = useState<Set<string>>(new Set());
  const [inlineImageUrl, setInlineImageUrl] = useState("");
  const [inlineCaption, setInlineCaption] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLink, setAdLink] = useState("");
  const [adAlt, setAdAlt] = useState("");
  const [adError, setAdError] = useState<string | null>(null);
  const [extLinkUrl, setExtLinkUrl] = useState("");
  const [extLinkLabel, setExtLinkLabel] = useState("");
  const [extLinkError, setExtLinkError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase
        .from("fusion_blogs")
        .select("id,slug,title")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(40);
      if (excludeBlogId) q = q.neq("id", excludeBlogId);
      const { data, error } = await q;
      if (cancelled || error || !data) return;
      setPosts(
        (data as { slug: string; title: string }[]).map((r) => ({
          slug: r.slug,
          title: r.title,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [excludeBlogId]);

  const insert = (snippet: string) => insertSnippet(body, setBody, textareaRef.current, snippet);

  const insertExternalLink = () => {
    setExtLinkError(null);
    const url = extLinkUrl.trim();
    if (!url) {
      setExtLinkError("Paste the full URL (https://…).");
      return;
    }
    if (!isHttpUrl(url)) {
      setExtLinkError("URL must start with https:// or http://.");
      return;
    }
    const ok = insertExternalLinkAtCursor(body, setBody, textareaRef.current, url, extLinkLabel);
    if (!ok) {
      setExtLinkError("Could not insert link.");
      return;
    }
    setExtLinkUrl("");
    setExtLinkLabel("");
  };

  const insertInlineFromUrl = () => {
    setInlineError(null);
    const url = inlineImageUrl.trim();
    if (!url) {
      setInlineError("Paste the direct image URL (https://…).");
      return;
    }
    if (!isHttpUrl(url)) {
      setInlineError("Image URL must start with https:// or http://.");
      return;
    }
    const cap = escapeMarkdownAlt(inlineCaption.trim()) || "Article image";
    insert(`![${cap}](${url})`);
    setInlineImageUrl("");
    setInlineCaption("");
  };

  const insertPromoFromUrls = () => {
    setAdError(null);
    const image = adImageUrl.trim();
    if (!image) {
      setAdError("Paste the banner image URL (https://…).");
      return;
    }
    if (!isHttpUrl(image)) {
      setAdError("Image URL must start with https:// or http://.");
      return;
    }
    const link = adLink.trim();
    if (link && !isHttpUrl(link)) {
      setAdError("Click URL must start with https:// or http://.");
      return;
    }
    const lines = [":::embed-ad", image];
    if (link) lines.push(link);
    const alt = adAlt.trim();
    if (alt) lines.push(alt);
    lines.push(":::");
    insert(lines.join("\n"));
    setAdImageUrl("");
    setAdLink("");
    setAdAlt("");
  };

  const insertRelated = () => {
    const slugs = [...selectedRelated];
    if (slugs.length === 0) return;
    insert([":::related", ...slugs, ":::"].join("\n"));
    setSelectedRelated(new Set());
  };

  return (
    <div className="rounded-lg border border-primary-100 bg-primary-50/40 p-4 space-y-4">
      <div className="text-sm font-semibold text-gray-900">Rich inserts (cursor position in body)</div>
      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Link2 className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
            External link in text
          </div>
          <p className="text-xs text-gray-600">
            Turns words into a clickable link (opens in a new tab). <strong>Tip:</strong> highlight text in the body first,
            then paste the URL — the selection becomes the link label (e.g. &quot;last week&quot; → article).
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL *</label>
            <input
              type="url"
              value={extLinkUrl}
              onChange={(e) => setExtLinkUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Link text (optional if text is selected in body)
            </label>
            <input
              type="text"
              value={extLinkLabel}
              onChange={(e) => setExtLinkLabel(e.target.value)}
              placeholder="e.g. last week"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
          </div>
          {extLinkError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2" role="alert">
              {extLinkError}
            </p>
          )}
          <button
            type="button"
            onClick={insertExternalLink}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-600 bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
          >
            Insert link at cursor
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ImagePlus className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
            Inline image (image link only)
          </div>
          <p className="text-xs text-gray-600">
            Paste a <strong>direct image URL</strong> (hosted JPG/PNG/GIF/WebP). Optional caption appears below the image on the article.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image URL *</label>
            <input
              type="url"
              value={inlineImageUrl}
              onChange={(e) => setInlineImageUrl(e.target.value)}
              placeholder="https://cdn.example.com/photo.jpg"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-mono text-[13px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caption (optional)</label>
            <input
              type="text"
              value={inlineCaption}
              onChange={(e) => setInlineCaption(e.target.value)}
              placeholder="Shown under the image"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
          </div>
          {inlineError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2" role="alert">
              {inlineError}
            </p>
          )}
          <button
            type="button"
            onClick={insertInlineFromUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-600 bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
          >
            Insert inline image at cursor
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Megaphone className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
            Promo / ad banner (image link only)
          </div>
          <p className="text-xs text-gray-600">
            Host the graphic elsewhere (CDN, drive public link, etc.), then paste its <strong>direct image URL</strong> here — no file upload.
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banner image URL *</label>
            <input
              type="url"
              value={adImageUrl}
              onChange={(e) => setAdImageUrl(e.target.value)}
              placeholder="https://example.com/banners/your-ad.png"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-mono text-[13px]"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Click-through URL (optional)</label>
              <input
                type="url"
                value={adLink}
                onChange={(e) => setAdLink(e.target.value)}
                placeholder="https://event-or-partner…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alt text (optional)</label>
              <input
                type="text"
                value={adAlt}
                onChange={(e) => setAdAlt(e.target.value)}
                placeholder="Describe banner for accessibility"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
          </div>
          {adError && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2" role="alert">
              {adError}
            </p>
          )}
          <button
            type="button"
            onClick={insertPromoFromUrls}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-600 bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
          >
            Insert promo block at cursor
          </button>
        </div>
      </div>

      <div className="border-t border-primary-100/80 pt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <BookMarked className="w-4 h-4 text-primary-600" />
          Related articles
        </div>
        <p className="text-xs text-gray-600">
          Tick posts, then insert — they render as a &quot;Related Articles&quot; row on the live article (only published posts).
        </p>
        <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 text-sm">
          {posts.length === 0 ? (
            <div className="p-3 text-gray-500 text-xs">No other published posts yet.</div>
          ) : (
            posts.map((p) => (
              <label key={p.slug} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedRelated.has(p.slug)}
                  onChange={() =>
                    setSelectedRelated((prev) => {
                      const next = new Set(prev);
                      if (next.has(p.slug)) next.delete(p.slug);
                      else next.add(p.slug);
                      return next;
                    })
                  }
                  className="mt-1 rounded border-gray-300 text-primary-600"
                />
                <span className="min-w-0">
                  <span className="font-mono text-xs text-gray-500">{p.slug}</span>
                  <span className="block text-gray-800 line-clamp-2">{p.title}</span>
                </span>
              </label>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={insertRelated}
          disabled={selectedRelated.size === 0}
          className="text-sm font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Insert related block ({selectedRelated.size} selected)
        </button>
      </div>

      <div className="text-xs text-gray-600 space-y-1 border-t border-gray-200/80 pt-3 font-mono leading-relaxed">
        <p>
          Inline link in a sentence:{" "}
          <code className="bg-white px-1 rounded border border-gray-200">[visible words](https://…)</code> — same as the
          toolbar above.
        </p>
        <p>
          Manual inline: <code className="bg-white px-1 rounded border border-gray-200">![caption](https://…)</code> on its own line.
        </p>
        <p>
          Manual: <code className="bg-white px-1 rounded border border-gray-200">:::related</code> then one slug per line,
          then <code className="bg-white px-1 rounded border border-gray-200">:::</code>.
        </p>
        <p>
          Manual promo: <code className="bg-white px-1 rounded border border-gray-200">:::embed-ad</code> → image URL → optional link URL → alt →{" "}
          <code className="bg-white px-1 rounded border border-gray-200">:::</code>.
        </p>
      </div>
    </div>
  );
}
