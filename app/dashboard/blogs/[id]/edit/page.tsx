"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const BLOG_CATEGORIES = [
  "Digital Marketing",
  "Events",
  "Branding",
  "Content",
  "Market Research",
  "Web Development",
  "Other",
];

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const blogId = useMemo(() => {
    const p = params?.id;
    if (Array.isArray(p)) return p[0] ?? "";
    return String(p ?? "");
  }, [params?.id]);

  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("Changer Fusions Team");
  const [category, setCategory] = useState("Digital Marketing");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [publishNow, setPublishNow] = useState(false);
  const [externalLinks, setExternalLinks] = useState<{ label: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Set once when post loads; used to detect first-time publish → newsletter notify */
  const [publishedAtOnLoad, setPublishedAtOnLoad] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, isAdmin, portalLoading, router, user]);

  useEffect(() => {
    if (!blogId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from("fusion_blogs")
          .select("*")
          .eq("id", blogId)
          .single();
        if (fetchErr) throw fetchErr;
        if (!data || cancelled) return;
        const row = data as Record<string, unknown>;
        setTitle(String(row.title ?? ""));
        setSlug(String(row.slug ?? ""));
        setExcerpt(String(row.excerpt ?? ""));
        setBody(String(row.body ?? ""));
        setAuthor(String(row.author ?? "Changer Fusions Team"));
        setCategory(String(row.category ?? "Digital Marketing"));
        const img = row.image_url ? String(row.image_url) : "";
        setImageUrl(img);
        setImagePreviewUrl(img || null);
        setPublishNow(!!row.published_at);
        setPublishedAtOnLoad(row.published_at ? String(row.published_at) : null);
        const links = row.external_links;
        setExternalLinks(
          Array.isArray(links) && links.length > 0
            ? links.map((l: { label?: string; url?: string }) => ({ label: String(l?.label ?? ""), url: String(l?.url ?? "") }))
            : []
        );
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load blog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [blogId]);

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
    if (!user || !blogId) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedSlug = slugify(slug);
      if (!normalizedSlug) throw new Error("Slug is required");
      let finalImageUrl: string | null = null;
      if (imageFile) finalImageUrl = await uploadImageFile(imageFile);
      else if (imageUrl.trim()) finalImageUrl = imageUrl.trim();

      const linksPayload = externalLinks
        .filter((l) => l.label.trim() && l.url.trim())
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }));
      const { error: updateErr } = await supabase
        .from("fusion_blogs")
        .update({
          slug: normalizedSlug,
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          body: body.trim() || null,
          author: author.trim() || "Changer Fusions Team",
          category: category.trim() || null,
          image_url: finalImageUrl,
          external_links: linksPayload.length ? linksPayload : [],
          published_at: publishNow ? new Date().toISOString() : null,
        })
        .eq("id", blogId);

      if (updateErr) throw updateErr;
      const shouldNotifyNewsletter = publishNow && publishedAtOnLoad === null;
      if (shouldNotifyNewsletter) {
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
      setError(e instanceof Error ? e.message : "Failed to update blog");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading || loading) {
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
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Edit Blog Post</h2>
          <p className="text-gray-600 mt-1 text-left">
            Update the post. Check &quot;Publish now&quot; to make it visible on the public Blogs page.
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
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
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
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="## subtitles, ### subheadings, **bold**, [label](https://…) or paste https://… for auto-links."
          />
          <p className="text-xs text-gray-500 mt-2">
            SEO: <strong>##</strong> / <strong>###</strong>, <strong>[label](https://…)</strong> or plain <strong>https://…</strong> in text. Add structured references in the section below if you like.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">References / external links (optional)</label>
          <p className="text-xs text-gray-500 mb-2">Links to other sites for SEO and backlink building.</p>
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
                placeholder="Label"
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
                onClick={() => { setImageFile(null); setImageUrl(""); setImagePreviewUrl(null); }}
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
            {saving ? "Saving…" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
