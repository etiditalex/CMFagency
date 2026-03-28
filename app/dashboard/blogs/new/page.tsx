"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { DEFAULT_BLOG_AUTHOR } from "@/lib/blog-defaults";
import { supabase } from "@/lib/supabase";
import BlogBodyInsertToolbar from "@/components/dashboard/BlogBodyInsertToolbar";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BLOG_CATEGORIES = [
  "News",
  "Business",
  "Startups",
  "Digital Marketing",
  "Events",
  "Branding",
  "Content",
  "Trends",
  "Market Research",
  "Web Development",
  "Other",
];

export default function NewBlogPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState(DEFAULT_BLOG_AUTHOR);
  const [category, setCategory] = useState("Digital Marketing");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [externalLinks, setExternalLinks] = useState<{ label: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, isAdmin, portalLoading, router, user]);

  useEffect(() => {
    if (!slug) setSlug(slugify(title));
  }, [title]);

  const uploadImageFile = async (file: File): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Session expired. Please sign in again.");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/campaign-image/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Image upload failed");
    }
    const { url } = (await res.json()) as { url?: string };
    return url ?? null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) throw new Error("Slug is required");
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImageFile(imageFile);
      const linksPayload = externalLinks
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
      const { error: insertErr } = await supabase.from("fusion_blogs").insert({
        slug: normalizedSlug,
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        body: body.trim() || null,
        author: author.trim() || DEFAULT_BLOG_AUTHOR,
        category: category.trim() || null,
        image_url: imageUrl,
        external_links: linksPayload.length ? linksPayload : [],
        published_at: publishNow ? new Date().toISOString() : null,
        created_by: user.id,
      });
      if (insertErr) throw insertErr;
      if (publishNow) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          void fetch("/api/newsletter/notify-blog-published", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ slug: normalizedSlug }),
          });
        }
      }
      router.push("/dashboard/blogs");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create blog");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex flex-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">New Blog Post</h2>
          <p className="text-gray-600 mt-1 text-left">
            Add a blog post to appear on the Blogs & News page. Leave &quot;Publish now&quot; unchecked to save as draft.
          </p>
        </div>
        <Link
          href="/dashboard/blogs"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
        >
          Back to blogs
        </Link>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <form onSubmit={onSubmit} className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. The Future of Digital Marketing in 2025"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            placeholder="future-of-digital-marketing-2025"
            required
          />
          <p className="text-xs text-gray-500 mt-2">URL: /blogs/{slugify(slug) || "slug"}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Short summary shown on the blog listing"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
          <BlogBodyInsertToolbar body={body} setBody={setBody} textareaRef={bodyTextareaRef} />
          <textarea
            ref={bodyTextareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="News-style body: headings, links, italics, images — see tips below."
          />
          <div className="text-xs text-gray-500 mt-2 space-y-1.5 leading-relaxed">
            <p>
              <strong>Structure:</strong> <code className="bg-gray-100 px-1 rounded">## Subtitle</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">### Section</code>. <strong>Bold:</strong>{" "}
              <code className="bg-gray-100 px-1 rounded">**like this**</code>. <strong>Italic:</strong>{" "}
              <code className="bg-gray-100 px-1 rounded">*like this*</code>.
            </p>
            <p>
              <strong>Link with your own words:</strong>{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">[click here](https://example.com/article)</code> — readers
              see &quot;click here&quot;, not the long URL. Plain <code className="bg-gray-100 px-1 rounded">https://…</code> in
              text also becomes clickable.
            </p>
            <p>
              <strong>Image + caption (own line):</strong>{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">
                ![This photo was from our meeting with…](https://yoursite.com/image.jpg)
              </code>{" "}
              — or use <strong>Inline image</strong> above to paste an image URL after a few paragraphs.
            </p>
            <p>
              <strong>Between paragraphs:</strong> use the toolbar for a <strong>promo / ad</strong> (paste a hosted image URL) or a{" "}
              <strong>Related articles</strong> block (headline + links to other posts).
            </p>
            <p>
              Body text uses a slightly taller line height on the live site. Use <strong>References</strong> below for a
              separate link list at the end of the article.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">References / external links (optional)</label>
          <p className="text-xs text-gray-500 mb-2">Add links to other sites (e.g. sources, further reading) for SEO and backlink building.</p>
          {externalLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => {
                  const next = [...externalLinks];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setExternalLinks(next);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Label (e.g. Forbes, Wikipedia)"
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => {
                  const next = [...externalLinks];
                  next[idx] = { ...next[idx], url: e.target.value };
                  setExternalLinks(next);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => setExternalLinks(externalLinks.filter((_, i) => i !== idx))}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                aria-label="Remove link"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExternalLinks([...externalLinks, { label: "", url: "" }])}
            className="text-sm text-primary-600 font-semibold hover:underline"
          >
            + Add reference link
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder={DEFAULT_BLOG_AUTHOR}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {BLOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Featured image (optional)</label>
          {imagePreviewUrl ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200 w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreviewUrl} alt="Preview" className="w-full h-40 object-cover" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreviewUrl(null); }}
                className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP (max 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    const reader = new FileReader();
                    reader.onload = () => setImagePreviewUrl(reader.result as string);
                    reader.readAsDataURL(f);
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="publishNow"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="publishNow" className="text-sm font-medium text-gray-700">
            Publish now (visible on public Blogs page)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/dashboard/blogs" className="px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 font-semibold">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className={`btn-primary ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {saving ? "Saving…" : publishNow ? "Publish" : "Save draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
