"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type AdRow = {
  id: string;
  title: string;
  image_url: string | null;
  href: string | null;
  approved: boolean;
  sort_order: number;
  created_at: string;
};

export default function BlogSidebarAdsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AdRow[]>([]);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [href, setHref] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

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
          .from("fusion_blog_sidebar_ads")
          .select("id,title,image_url,href,approved,sort_order,created_at")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (err) throw err;
        if (!cancelled) setRows((data ?? []) as AdRow[]);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const refresh = async () => {
    const { data, error: err } = await supabase
      .from("fusion_blog_sidebar_ads")
      .select("id,title,image_url,href,approved,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (!err) setRows((data ?? []) as AdRow[]);
  };

  const addRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { error: insErr } = await supabase.from("fusion_blog_sidebar_ads").insert({
        title: title.trim(),
        image_url: imageUrl.trim() || null,
        href: href.trim() || null,
        sort_order: sortOrder,
        approved: false,
      });
      if (insErr) throw insErr;
      setTitle("");
      setImageUrl("");
      setHref("");
      setSortOrder(0);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  const toggleApproved = async (id: string, next: boolean) => {
    setError(null);
    try {
      const { error: uErr } = await supabase.from("fusion_blog_sidebar_ads").update({ approved: next }).eq("id", id);
      if (uErr) throw uErr;
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, approved: next } : r)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this sidebar item?")) return;
    setError(null);
    try {
      const { error: dErr } = await supabase.from("fusion_blog_sidebar_ads").delete().eq("id", id);
      if (dErr) throw dErr;
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left max-w-4xl">
      <Link
        href="/dashboard/blogs"
        className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm mb-4 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to blogs
      </Link>
      <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Blog sidebar ads</h2>
      <p className="text-gray-600 mt-1 text-sm md:text-base mb-8">
        Promotional blocks on each public blog article (right column). Only items marked <strong>Approved</strong> appear
        on the site.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{error}</div>
      )}

      <form onSubmit={addRow} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-10 space-y-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New item
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title / label</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Samsung Galaxy campaign"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (https)</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            type="url"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link (optional)</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://…"
            type="url"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort order (lower first)</label>
          <input
            type="number"
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add (draft — approve when ready)"}
        </button>
      </form>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900">All items</h3>
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm">No items yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{r.title}</p>
                  <p className="text-xs text-gray-500 truncate">{r.image_url || "No image"}</p>
                  <p className="text-xs text-gray-500 truncate">{r.href || "No link"}</p>
                  <p className="text-xs text-gray-400 mt-1">Sort: {r.sort_order}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.approved}
                      onChange={(e) => toggleApproved(r.id, e.target.checked)}
                    />
                    Approved
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 px-2 py-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
