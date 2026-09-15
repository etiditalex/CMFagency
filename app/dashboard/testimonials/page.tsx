"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import {
  isMissingTestimonialsTable,
  TESTIMONIAL_SELECT,
  testimonialInitials,
  type Testimonial,
} from "@/lib/testimonials";

type EventOption = { slug: string; title: string };

const emptyForm = {
  name: "",
  role: "",
  quote: "",
  image_url: "",
  rating: "5",
  event_slug: "",
  event_title: "",
  show_on_home: true,
  show_on_testimonials_page: true,
  is_active: true,
  sort_order: "0",
};

function accessTokenNeedsRefresh(accessToken: string, leewaySec = 120): boolean {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return true;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "==".slice(0, (4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return true;
    return payload.exp * 1000 <= Date.now() + leewaySec * 1000;
  } catch {
    return true;
  }
}

export default function DashboardTestimonialsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, isPortalMember, isAdmin, portalLoading, router, user]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user?.id || !isPortalMember || !isAdmin) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [{ data, error: err }, eventsRes] = await Promise.all([
          supabase
            .from("testimonials")
            .select(TESTIMONIAL_SELECT)
            .order("is_active", { ascending: true })
            .order("sort_order", { ascending: true })
            .order("id", { ascending: true }),
          supabase.from("fusion_events").select("slug,title").order("event_date", { ascending: false }).limit(80),
        ]);
        if (err) throw err;
        if (!cancelled) {
          setItems((data ?? []) as Testimonial[]);
          setEvents((eventsRes.data ?? []) as EventOption[]);
        }
      } catch (e: unknown) {
        const errObj = e as { message?: string; code?: string };
        if (!cancelled) {
          if (isMissingTestimonialsTable(errObj)) {
            setError(
              "The testimonials table is not in this database yet. Run database/ticketing_voting_mvp_patch_92_testimonials.sql in the Supabase SQL editor."
            );
            setItems([]);
          } else {
            setError(e instanceof Error ? e.message : "Failed to load testimonials");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, user?.id, isPortalMember, isAdmin]);

  useEffect(() => {
    if (imageFile) return;
    const t = form.image_url.trim();
    if (t.startsWith("http") || t.startsWith("data:")) setImagePreviewUrl(t);
    else setImagePreviewUrl("");
  }, [form.image_url, imageFile]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreviewUrl("");
  };

  const startEdit = (row: Testimonial) => {
    setEditingId(row.id);
    setImageFile(null);
    setImagePreviewUrl(row.image_url || "");
    setForm({
      name: row.name || "",
      role: row.role || "",
      quote: row.quote || "",
      image_url: row.image_url || "",
      rating: row.rating != null ? String(row.rating) : "5",
      event_slug: row.event_slug || "",
      event_title: row.event_title || "",
      show_on_home: !!row.show_on_home,
      show_on_testimonials_page: !!row.show_on_testimonials_page,
      is_active: !!row.is_active,
      sort_order: String(row.sort_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearImage = () => {
    setImageFile(null);
    setForm((f) => ({ ...f, image_url: "" }));
    setImagePreviewUrl("");
  };

  const uploadImageFile = async (file: File): Promise<string | null> => {
    const postUpload = async (accessToken: string) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch("/api/campaign-image/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
    };

    let {
      data: { session },
    } = await supabase.auth.getSession();
    let token = session?.access_token;
    if (!token || accessTokenNeedsRefresh(token)) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session?.access_token) {
        throw new Error("Session expired. Please sign in again.");
      }
      token = data.session.access_token;
    }

    let res = await postUpload(token);
    if (res.status === 401) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session?.access_token) {
        throw new Error("Session expired. Please sign in again.");
      }
      res = await postUpload(data.session.access_token);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Image upload failed");
    }
    const { url } = (await res.json()) as { url?: string };
    return url ?? null;
  };

  const buildPayload = async () => {
    const name = form.name.trim();
    const quote = form.quote.trim();
    if (!name || !quote) {
      throw new Error("Name and quote are required.");
    }
    let image_url = form.image_url.trim();
    if (imageFile) {
      const uploaded = await uploadImageFile(imageFile);
      if (!uploaded) throw new Error("Image upload returned no URL.");
      image_url = uploaded;
    }
    const ratingNum = Number(form.rating);
    const sort_order = Math.trunc(Number(form.sort_order));
    const selectedEvent = events.find((event) => event.slug === form.event_slug);
    const payload = {
      name,
      role: form.role.trim(),
      quote,
      image_url,
      rating: Number.isFinite(ratingNum) ? Math.min(5, Math.max(0, ratingNum)) : null,
      event_slug: form.event_slug.trim() || null,
      event_title: selectedEvent?.title || form.event_title.trim() || null,
      show_on_home: form.show_on_home,
      show_on_testimonials_page: form.show_on_testimonials_page,
      is_active: form.is_active,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    };
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = await buildPayload();
      if (editingId != null) {
        const { error: err } = await supabase.from("testimonials").update(payload).eq("id", editingId);
        if (err) throw err;
        setItems((prev) =>
          prev
            .map((row) => (row.id === editingId ? { ...row, ...payload, id: editingId } : row))
            .sort((a, b) => Number(a.is_active) - Number(b.is_active) || a.sort_order - b.sort_order || a.id - b.id)
        );
      } else {
        const { data, error: err } = await supabase
          .from("testimonials")
          .insert({ ...payload, source: "dashboard" })
          .select(TESTIMONIAL_SELECT)
          .single();
        if (err) throw err;
        const row = data as Testimonial;
        setItems((prev) =>
          [...prev, row].sort(
            (a, b) => Number(a.is_active) - Number(b.is_active) || a.sort_order - b.sort_order || a.id - b.id
          )
        );
      }
      resetForm();
    } catch (e2: unknown) {
      setError(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const publishRow = async (row: Testimonial) => {
    setError(null);
    const payload = {
      is_active: true,
      show_on_testimonials_page: true,
      show_on_home: row.show_on_home,
    };
    const { error: err } = await supabase.from("testimonials").update(payload).eq("id", row.id);
    if (err) {
      setError(err.message);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...payload } : item)));
  };

  const handleDelete = async (row: Testimonial) => {
    if (!confirm(`Delete “${row.name}”? This removes the testimonial from the homepage and testimonials page.`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      const { error: err } = await supabase.from("testimonials").delete().eq("id", row.id);
      if (err) throw err;
      setItems((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const pendingCount = useMemo(
    () => items.filter((row) => row.source === "event_review" && !row.is_active).length,
    [items]
  );

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[40vh] bg-transparent flex items-center justify-center" aria-busy="true">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  if (loading) {
    return (
      <div className="text-left" aria-busy="true">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 max-w-xl bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-64 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="text-left">
      <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a2332] pb-3 border-b border-[#e5e5e5]">Testimonials</h2>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Add Success Stories for the homepage and quotes for the public{" "}
            <Link href="/testimonials" className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1">
              Testimonials <ExternalLink className="w-3.5 h-3.5" />
            </Link>{" "}
            page. Reviews from past events appear here as pending until you publish them.
          </p>
          {pendingCount > 0 && (
            <p className="mt-2 text-sm font-semibold text-amber-800">
              {pendingCount} event review{pendingCount === 1 ? "" : "s"} waiting to be published.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 p-6 bg-white border border-[#e5e5e5] space-y-4 max-w-3xl">
        <h3 className="text-lg font-bold text-gray-900">{editingId != null ? "Edit testimonial" : "Add testimonial"}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role / organisation</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Founder, Studio North"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quote *</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[120px]"
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Photo</label>
            {imagePreviewUrl ? (
              <div className="relative mb-3 w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreviewUrl} alt="" className="h-28 w-28 rounded-full object-cover bg-gray-100" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700"
                  aria-label="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer mb-3 max-w-md">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-primary-500">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Upload a portrait</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!file) return;
                    setImageFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setImagePreviewUrl(String(reader.result ?? ""));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="Or paste an image URL"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Rating (0–5)</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.5"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Sort order</label>
            <input
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Linked past event (optional)</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.event_slug}
              onChange={(e) => {
                const slug = e.target.value;
                const selected = events.find((event) => event.slug === slug);
                setForm((f) => ({ ...f, event_slug: slug, event_title: selected?.title || f.event_title }));
              }}
            >
              <option value="">Not linked to an event</option>
              {events.map((event) => (
                <option key={event.slug} value={event.slug}>
                  {event.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">Published</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_on_home}
                onChange={(e) => setForm((f) => ({ ...f, show_on_home: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">Show on homepage Success Stories</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.show_on_testimonials_page}
                onChange={(e) => setForm((f) => ({ ...f, show_on_testimonials_page: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">Show on Testimonials page</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
          >
            {editingId != null ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {saving ? "Saving..." : editingId != null ? "Update testimonial" : "Add testimonial"}
          </button>
          {editingId != null && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="mt-10 bg-white border border-[#e5e5e5] overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white border-b border-[#e5e5e5]">
              <tr className="text-left">
                <th className="px-6 py-3 font-bold text-gray-600">Person</th>
                <th className="px-6 py-3 font-bold text-gray-600">Placement</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
                <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={4}>
                    No testimonials yet. Add one using the form above.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {row.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={row.image_url} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-sm">
                            {testimonialInitials(row.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900">{row.name}</div>
                          <div className="text-xs text-gray-500">{row.role || "—"}</div>
                          {row.event_title ? (
                            <div className="text-xs text-primary-700 mt-0.5">From {row.event_title}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex flex-col gap-1">
                        {row.show_on_home ? <span>Homepage</span> : null}
                        {row.show_on_testimonials_page ? <span>Testimonials page</span> : null}
                        {!row.show_on_home && !row.show_on_testimonials_page ? <span className="text-gray-400">Not placed</span> : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-bold ${
                            row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {row.is_active ? "Published" : "Pending"}
                        </span>
                        {row.source === "event_review" ? (
                          <span className="inline-flex w-fit px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                            Event review
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {!row.is_active ? (
                          <button
                            type="button"
                            onClick={() => void publishRow(row)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                          >
                            <Check className="w-4 h-4" />
                            Publish
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 text-gray-800 hover:bg-gray-50"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
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
