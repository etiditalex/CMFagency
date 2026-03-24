"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ExternalLink, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  created_at: string;
};

export default function DashboardBlogsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<BlogRow[]>([]);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notifySlug, setNotifySlug] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, isAdmin, portalLoading, router, user]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from("fusion_blogs")
          .select("id,slug,title,excerpt,author,category,image_url,published_at,created_at")
          .order("created_at", { ascending: false });
        if (err) throw err;
        if (!cancelled) setBlogs((data ?? []) as BlogRow[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load blogs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const filtered = blogs.filter((b) => {
    if (filter === "published") return b.published_at != null;
    if (filter === "draft") return b.published_at == null;
    return true;
  });

  const notifySubscribers = async (slug: string, title: string) => {
    if (!confirm(`Send a "new article" email about "${title}" to all newsletter subscribers?`)) return;
    setNotifySlug(slug);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");
      const res = await fetch("/api/newsletter/notify-blog-published", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        sent?: number;
        failed?: number;
        total?: number;
        message?: string;
      };
      if (!res.ok || !j.ok) throw new Error(j.error || "Notify failed");
      if (j.message) {
        setError(null);
        alert(j.message);
      } else {
        alert(`Queued: ${j.sent ?? 0} sent${typeof j.failed === "number" && j.failed > 0 ? `, ${j.failed} failed` : ""} (${j.total ?? 0} subscribers).`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Notify failed");
    } finally {
      setNotifySlug(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete blog "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const { error: err } = await supabase.from("fusion_blogs").delete().eq("id", id);
      if (err) throw err;
      setBlogs((prev) => prev.filter((b) => b.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blogs...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  const publishedCount = blogs.filter((b) => b.published_at != null).length;
  const draftCount = blogs.filter((b) => b.published_at == null).length;

  return (
    <div className="text-left">
      <div className="flex flex-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Blogs</h2>
          <p className="text-gray-600 mt-1 max-w-3xl text-left">
            Create and manage blog posts shown on the public Blogs & News page. The first time you publish a post,
            subscribers on the newsletter list get an email (Resend + Supabase service role required). For posts that
            were already published, use <strong>Email subscribers</strong> on that row to send the announcement again.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/blogs/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800"
          >
            <Plus className="w-4 h-4" />
            New Blog
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          { id: "all" as const, label: `All (${blogs.length})` },
          { id: "published" as const, label: `Published (${publishedCount})` },
          { id: "draft" as const, label: `Draft (${draftCount})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === t.id ? "bg-primary-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Post</th>
                <th className="px-6 py-3 font-bold text-gray-600">Category</th>
                <th className="px-6 py-3 font-bold text-gray-600">Date</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
                <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={5}>
                    No blogs yet.{" "}
                    <Link href="/dashboard/blogs/new" className="text-primary-600 font-semibold hover:underline">
                      Create your first blog post
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {b.image_url && (
                          <img src={b.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                        )}
                        <span className="font-semibold text-gray-900">{b.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{b.category ?? "—"}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {b.published_at
                        ? format(new Date(b.published_at), "MMM d, yyyy")
                        : format(new Date(b.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                          b.published_at ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {b.published_at ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {b.published_at && (
                          <>
                            <Link
                              href={`/blogs/${b.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-semibold"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => notifySubscribers(b.slug, b.title)}
                              disabled={notifySlug === b.slug}
                              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
                              title="Email all newsletter subscribers about this post"
                            >
                              <Mail className="w-4 h-4" />
                              {notifySlug === b.slug ? "Sending…" : "Email subscribers"}
                            </button>
                          </>
                        )}
                        <Link
                          href={`/dashboard/blogs/${b.id}/edit`}
                          className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-semibold"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.title)}
                          disabled={deletingId === b.id}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
