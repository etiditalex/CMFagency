"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type GalleryRow = {
  id: number;
  title: string;
  image_url: string;
  category: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

const emptyForm = {
  title: "",
  image_url: "",
  category: "General",
  is_featured: false,
  is_active: true,
  sort_order: "0",
};

function isMissingGalleryTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = String(err.message ?? "").toLowerCase();
  const code = String(err.code ?? "");
  return code === "42P01" || (msg.includes("gallery_images") && msg.includes("does not exist"));
}

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

export default function DashboardGalleryPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

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
        const { data, error: err } = await supabase
          .from("gallery_images")
          .select("id,title,image_url,category,is_featured,is_active,sort_order,updated_at")
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });
        if (err) throw err;
        if (!cancelled) setItems((data ?? []) as GalleryRow[]);
      } catch (e: unknown) {
        const errObj = e as { message?: string; code?: string };
        if (!cancelled) {
          if (isMissingGalleryTable(errObj)) {
            setError(
              "The gallery_images table is not in this database yet. Run database/ticketing_voting_mvp_patch_66_gallery_images.sql in the Supabase SQL editor."
            );
            setItems([]);
          } else {
            setError(e instanceof Error ? e.message : "Failed to load gallery");
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
    if (imageFiles.length > 0) return;
    const t = form.image_url.trim();
    if (t.startsWith("http") || t.startsWith("data:")) setImagePreviewUrls([t]);
    else setImagePreviewUrls([]);
  }, [form.image_url, imageFiles.length]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFiles([]);
    setImagePreviewUrls([]);
  };

  const startEdit = (row: GalleryRow) => {
    setEditingId(row.id);
    setImageFiles([]);
    setImagePreviewUrls(row.image_url ? [row.image_url] : []);
    setForm({
      title: row.title || "",
      image_url: row.image_url || "",
      category: row.category || "General",
      is_featured: !!row.is_featured,
      is_active: !!row.is_active,
      sort_order: String(row.sort_order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearImage = () => {
    if (imageFiles.length > 0) {
      setImageFiles([]);
      const t = form.image_url.trim();
      setImagePreviewUrls(t && (t.startsWith("http") || t.startsWith("data:")) ? [t] : []);
    } else {
      setForm((f) => ({ ...f, image_url: "" }));
      setImagePreviewUrls([]);
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const title = form.title.trim();
    const urlFallback = form.image_url.trim();
    const category = form.category.trim() || "General";
    const sort_order = Math.trunc(Number(form.sort_order));
    const sortVal = Number.isFinite(sort_order) ? sort_order : 0;

    if (imageFiles.length === 0 && !urlFallback) {
      setError("Add a gallery image: upload a file from your device or paste an image URL.");
      return;
    }

    setSaving(true);
    try {
      if (editingId != null) {
        let image_url = urlFallback;
        if (imageFiles.length > 0) {
          const uploaded = await uploadImageFile(imageFiles[0]);
          if (!uploaded) throw new Error("Image upload returned no URL.");
          image_url = uploaded;
        }
        const payload = {
          title,
          image_url,
          category,
          is_featured: form.is_featured,
          is_active: form.is_active,
          sort_order: sortVal,
        };
        const { error: err } = await supabase.from("gallery_images").update(payload).eq("id", editingId);
        if (err) throw err;
        setItems((prev) =>
          prev
            .map((r) => (r.id === editingId ? { ...r, ...payload, id: editingId, updated_at: new Date().toISOString() } : r))
            .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        );
        resetForm();
      } else {
        if (imageFiles.length > 0) {
          const uploadedUrls = await Promise.all(imageFiles.map((file) => uploadImageFile(file)));
          const payloads = uploadedUrls.map((uploadedUrl, idx) => {
            if (!uploadedUrl) throw new Error("Image upload returned no URL.");
            const fallbackTitle = imageFiles[idx]?.name.replace(/\.[^.]+$/, "") || "";
            return {
              title: title || fallbackTitle,
              image_url: uploadedUrl,
              category,
              is_featured: form.is_featured,
              is_active: form.is_active,
              sort_order: sortVal + idx,
            };
          });
          const { data, error: err } = await supabase.from("gallery_images").insert(payloads).select();
          if (err) throw err;
          const rows = (data ?? []) as GalleryRow[];
          setItems((prev) => [...prev, ...rows].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
        } else {
          const payload = {
            title,
            image_url: urlFallback,
            category,
            is_featured: form.is_featured,
            is_active: form.is_active,
            sort_order: sortVal,
          };
          const { data, error: err } = await supabase.from("gallery_images").insert(payload).select().single();
          if (err) throw err;
          const row = data as GalleryRow;
          setItems((prev) => [...prev, row].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
        }
        resetForm();
      }
    } catch (e2: unknown) {
      setError(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete “${title || "this image"}”? This removes it from the public gallery.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const { error: err } = await supabase.from("gallery_images").delete().eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of items) {
      if (r.category?.trim()) s.add(r.category.trim());
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

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
      <div className="flex flex-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a2332] pb-3 border-b border-[#e5e5e5]">Gallery</h2>
          <p className="text-gray-600 mt-1 max-w-3xl">
            Upload and manage images shown on the public{" "}
            <Link href="/portfolios" className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-1">
              Gallery <ExternalLink className="w-3.5 h-3.5" />
            </Link>{" "}
            page and the homepage carousel. Shoppers only see items marked <strong>Active</strong>.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">{error}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 p-6 bg-white border border-[#e5e5e5] space-y-4 max-w-3xl"
      >
        <h3 className="text-lg font-bold text-gray-900">{editingId != null ? "Edit image" : "Add image"}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Title (optional)</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. CFMA 2025 runway moment"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Gallery image</label>
            <p className="text-xs text-gray-500 mb-3">
              Upload one or more files (JPG, PNG, GIF, WebP - max 5MB each) or paste a URL below.
              {editingId != null ? " Uploading replaces the URL for this save." : " All selected files will be uploaded in one save."}
            </p>

            {imagePreviewUrls.length > 0 ? (
              <div className="relative rounded-lg border border-gray-200 p-3 w-full max-w-2xl mb-3">
                {imagePreviewUrls.length > 1 && (
                  <p className="text-xs font-semibold text-gray-600 mb-2">{imagePreviewUrls.length} images selected</p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {imagePreviewUrls.slice(0, 6).map((previewUrl, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${previewUrl}-${idx}`}
                      src={previewUrl}
                      alt="Gallery preview"
                      className="w-full h-28 object-cover rounded bg-gray-100"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                {imagePreviewUrls.length > 6 && (
                  <p className="text-xs text-gray-500 mt-2">Showing 6 of {imagePreviewUrls.length} previews.</p>
                )}
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700"
                  aria-label="Remove selected image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer mb-3">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors max-w-md">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">{editingId != null ? "Click to upload from your device" : "Click to upload one or many images"}</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP (max 5MB each)</p>
                </div>
                <input
                  type="file"
                  multiple={editingId == null}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length > 0) {
                      const selected = editingId != null ? [files[0]] : files;
                      setImageFiles(selected);
                      void Promise.all(
                        selected.map(
                          (file) =>
                            new Promise<string>((resolve) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(String(reader.result ?? ""));
                              reader.onerror = () => resolve("");
                              reader.readAsDataURL(file);
                            })
                        )
                      ).then((previews) => setImagePreviewUrls(previews.filter(Boolean)));
                    }
                  }}
                />
              </label>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">Or paste image URL</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://... (optional if you upload file(s))"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Events"
              list="gallery-category-suggest"
            />
            <datalist id="gallery-category-suggest">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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

          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">Active on public gallery</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">Featured (homepage priority)</span>
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
            {saving ? "Saving..." : editingId != null ? "Update image" : imageFiles.length > 1 ? `Add ${imageFiles.length} images` : "Add image"}
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
                <th className="px-6 py-3 font-bold text-gray-600">Image</th>
                <th className="px-6 py-3 font-bold text-gray-600">Category</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
                <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={4}>
                    No gallery images yet. Add one using the form above.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.image_url} alt="" className="w-16 h-12 rounded object-cover bg-gray-100" />
                        <div>
                          <div className="font-semibold text-gray-900">{row.title || "—"}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Sort: {row.sort_order ?? 0}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{row.category || "General"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-bold ${
                            row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.is_active ? "Active" : "Hidden"}
                        </span>
                        {row.is_featured && (
                          <span className="inline-flex w-fit px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
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
                          onClick={() => handleDelete(row.id, row.title || "this image")}
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

