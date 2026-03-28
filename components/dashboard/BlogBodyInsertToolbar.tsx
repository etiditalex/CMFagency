"use client";

import { useEffect, useRef, useState } from "react";
import { BookMarked, ImagePlus, Megaphone, Upload } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  body: string;
  setBody: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  uploadImageFile: (file: File) => Promise<string | null>;
  /** When editing, exclude current post from the related-articles picker. */
  excludeBlogId?: string;
};

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

/** Must match `/api/campaign-image/upload` — only these types are accepted from the device. */
const DEVICE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

function isDeviceImageFile(f: File): boolean {
  return (DEVICE_IMAGE_TYPES as readonly string[]).includes(f.type);
}

export default function BlogBodyInsertToolbar({
  body,
  setBody,
  textareaRef,
  uploadImageFile,
  excludeBlogId,
}: Props) {
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const adFileRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<{ slug: string; title: string }[]>([]);
  const [selectedRelated, setSelectedRelated] = useState<Set<string>>(new Set());
  const [adLink, setAdLink] = useState("");
  const [adAlt, setAdAlt] = useState("");
  const [inlineUploading, setInlineUploading] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const inlineInFlightRef = useRef(false);

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

  const processInlineDeviceFile = async (f: File) => {
    if (inlineInFlightRef.current) return;
    inlineInFlightRef.current = true;
    setInlineError(null);
    if (!isDeviceImageFile(f)) {
      setInlineError("Use a JPG, PNG, GIF, or WebP file from your device (max 5MB).");
      inlineInFlightRef.current = false;
      return;
    }
    setInlineUploading(true);
    try {
      const url = await uploadImageFile(f);
      if (!url) {
        setInlineError("Upload did not return an image URL. Try again.");
        return;
      }
      const cap =
        typeof window !== "undefined"
          ? window.prompt("Caption below image (optional):", "") ?? ""
          : "";
      const capEsc = escapeMarkdownAlt(cap) || "Article image";
      insert(`![${capEsc}](${url})`);
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "Upload failed. Check your connection and try again.");
    } finally {
      setInlineUploading(false);
      inlineInFlightRef.current = false;
    }
  };

  const onInlineFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    await processInlineDeviceFile(f);
  };

  const onInlineDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onInlineDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await processInlineDeviceFile(f);
  };

  const onAdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const url = await uploadImageFile(f);
      if (!url) return;
      const lines = [":::embed-ad", url];
      const link = adLink.trim();
      if (link && (link.startsWith("http://") || link.startsWith("https://"))) {
        lines.push(link);
      }
      const alt = adAlt.trim();
      if (alt) lines.push(alt);
      lines.push(":::");
      insert(lines.join("\n"));
      setAdLink("");
      setAdAlt("");
    } catch {
      /* noop */
    }
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
        <input
          ref={inlineFileRef}
          id="blog-body-inline-image-upload"
          type="file"
          accept={DEVICE_IMAGE_TYPES.join(",")}
          className="sr-only"
          onChange={onInlineFileInput}
        />
        <label
          htmlFor="blog-body-inline-image-upload"
          onDragOver={onInlineDragOver}
          onDrop={onInlineDrop}
          className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-4 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-colors ${inlineUploading ? "pointer-events-none opacity-70" : ""}`}
        >
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <Upload className="w-5 h-5" aria-hidden />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
                Upload inline image from your device
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Click to choose a file, or drag and drop here. JPG, PNG, GIF, WebP · max 5MB. Inserts at the cursor in the body.
              </p>
            </div>
          </div>
        </label>
        {inlineUploading && (
          <p className="text-xs font-medium text-primary-700" role="status">
            Uploading from your device…
          </p>
        )}
        {inlineError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2" role="alert">
            {inlineError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <input ref={adFileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={onAdFile} />
          <button
            type="button"
            onClick={() => adFileRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <Megaphone className="w-4 h-4 shrink-0 text-primary-600" />
            Upload promo / ad banner from device
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Promo — click URL (optional)</label>
          <input
            type="url"
            value={adLink}
            onChange={(e) => setAdLink(e.target.value)}
            placeholder="https://event-or-partner-link…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Promo — alt text (optional)</label>
          <input
            type="text"
            value={adAlt}
            onChange={(e) => setAdAlt(e.target.value)}
            placeholder="Describe banner for accessibility"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          />
        </div>
      </div>
      <p className="text-xs text-gray-600">
        Use <strong>Promo / ad banner</strong> after filling URL/alt: uploads the graphic and inserts a full-width block (like a sponsor strip between paragraphs).
      </p>

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
