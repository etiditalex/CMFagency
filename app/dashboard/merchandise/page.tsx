"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type MerchRow = {
  id: number;
  name: string;
  price_kes: number;
  original_price_kes: number | null;
  short_description: string;
  image_url: string;
  category: string;
  in_stock: boolean;
  is_active: boolean;
  sort_order: number;
  available_sizes?: string[] | null;
  available_colors?: string[] | null;
  updated_at: string;
};

const emptyForm = {
  name: "",
  price_kes: "",
  original_price_kes: "",
  short_description: "",
  image_url: "",
  category: "General",
  in_stock: true,
  is_active: true,
  sort_order: "0",
  sizes: [] as string[],
  colors_text: "",
};

const SIZE_OPTIONS = ["SMALL", "MEDIUM", "LARGE", "XL", "XXL"] as const;

function isMissingMerchTable(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = String(err.message ?? "").toLowerCase();
  const code = String(err.code ?? "");
  return code === "42P01" || (msg.includes("merchandise_items") && msg.includes("does not exist"));
}

/** If true, refresh before upload so we do not pay for a full upload + 401 + upload again. */
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

export default function DashboardMerchandisePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MerchRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

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
          .from("merchandise_items")
          .select(
            "id,name,price_kes,original_price_kes,short_description,image_url,category,in_stock,is_active,sort_order,available_sizes,available_colors,updated_at"
          )
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true });
        if (err) throw err;
        if (!cancelled) setItems((data ?? []) as MerchRow[]);
      } catch (e: unknown) {
        const errObj = e as { message?: string; code?: string };
        if (!cancelled) {
          if (isMissingMerchTable(errObj)) {
            setError(
              "The merchandise_items table is not in this database yet. Run database/ticketing_voting_mvp_patch_65_merchandise_items.sql in the Supabase SQL editor."
            );
            setItems([]);
          } else {
            setError(e instanceof Error ? e.message : "Failed to load merchandise");
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

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const startEdit = (row: MerchRow) => {
    setEditingId(row.id);
    setImageFile(null);
    setImagePreviewUrl(row.image_url || null);
    setForm({
      name: row.name,
      price_kes: String(row.price_kes),
      original_price_kes: row.original_price_kes != null ? String(row.original_price_kes) : "",
      short_description: row.short_description,
      image_url: row.image_url,
      category: row.category || "General",
      in_stock: row.in_stock,
      is_active: row.is_active,
      sort_order: String(row.sort_order ?? 0),
      sizes: Array.isArray(row.available_sizes) ? row.available_sizes.filter(Boolean) : [],
      colors_text: Array.isArray(row.available_colors) ? row.available_colors.filter(Boolean).join(", ") : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (imageFile) return;
    const t = form.image_url.trim();
    if (t.startsWith("http") || t.startsWith("data:")) setImagePreviewUrl(t);
    else setImagePreviewUrl(null);
  }, [form.image_url, imageFile]);

  const clearProductImage = () => {
    if (imageFile) {
      setImageFile(null);
      const t = form.image_url.trim();
      setImagePreviewUrl(t && (t.startsWith("http") || t.startsWith("data:")) ? t : null);
    } else {
      setForm((f) => ({ ...f, image_url: "" }));
      setImagePreviewUrl(null);
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

    let { data: { session } } = await supabase.auth.getSession();
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
    const name = form.name.trim();
    const urlFallback = form.image_url.trim();
    const short_description = form.short_description.trim();
    const category = form.category.trim() || "General";
    const priceRaw = Math.trunc(Number(form.price_kes));
    const price_kes_val = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : NaN;
    if (!name) {
      setError("Product name is required.");
      return;
    }
    if (!imageFile && !urlFallback) {
      setError("Add a product image: upload a file from your device or paste an image URL.");
      return;
    }
    if (!Number.isFinite(price_kes_val)) {
      setError("Price must be a valid number.");
      return;
    }
    const origRaw = form.original_price_kes.trim();
    let original_price_kes: number | null = null;
    if (origRaw.length > 0) {
      const o = Math.max(0, Math.trunc(Number(origRaw)));
      if (!Number.isFinite(o)) {
        setError("Original price must be a valid number when set.");
        return;
      }
      original_price_kes = o;
    }
    const sort_order = Math.trunc(Number(form.sort_order));
    const sortVal = Number.isFinite(sort_order) ? sort_order : 0;
    const sizes = Array.isArray((form as any).sizes) ? (form as any).sizes.filter(Boolean) : [];
    const colors_text = String((form as any).colors_text ?? "");
    const available_colors = colors_text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);

    setSaving(true);
    try {
      let image_url = urlFallback;
      if (imageFile) {
        const uploaded = await uploadImageFile(imageFile);
        if (!uploaded) throw new Error("Image upload returned no URL.");
        image_url = uploaded;
      }
      const payload = {
        name,
        price_kes: price_kes_val,
        original_price_kes,
        short_description,
        image_url,
        category,
        in_stock: form.in_stock,
        is_active: form.is_active,
        sort_order: sortVal,
        available_sizes: sizes,
        available_colors,
      };
      if (editingId != null) {
        const { error: err } = await supabase.from("merchandise_items").update(payload).eq("id", editingId);
        if (err) throw err;
        setItems((prev) =>
          prev
            .map((r) => (r.id === editingId ? { ...r, ...(payload as any), id: editingId, updated_at: new Date().toISOString() } : r))
            .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        );
        resetForm();
      } else {
        const { data, error: err } = await supabase.from("merchandise_items").insert(payload).select().single();
        if (err) throw err;
        const row = data as MerchRow;
        setItems((prev) => [...prev, row].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id));
        resetForm();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete “${title}”? This removes it from the storefront.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const { error: err } = await supabase.from("merchandise_items").delete().eq("id", id);
      if (err) throw err;
      setItems((prev) => prev.filter((r) => r.id !== id));
      if (editingId === id) resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

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
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 max-w-xl bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-64 bg-gray-100 rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="text-left">
      <div className="flex flex-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a2332] pb-3 border-b border-[#e5e5e5]">Merchandise</h2>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">{error}</div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 p-6 bg-white border border-[#e5e5e5] space-y-4 max-w-3xl"
      >
        <h3 className="text-lg font-bold text-gray-900">{editingId != null ? "Edit product" : "Add product"}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Product name</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Classic T-Shirt"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Price (KSh)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.price_kes}
              onChange={(e) => setForm((f) => ({ ...f, price_kes: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Original price (KSh, optional)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.original_price_kes}
              onChange={(e) => setForm((f) => ({ ...f, original_price_kes: e.target.value }))}
              placeholder="Leave empty if not on sale"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Short description</label>
            <textarea
              className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[88px]"
              value={form.short_description}
              onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
              placeholder="One or two sentences shown on the product card."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Available sizes</label>
            <p className="text-xs text-gray-500 mb-2">Select sizes buyers can choose (leave empty if not applicable).</p>
            <div className="flex flex-wrap gap-3">
              {SIZE_OPTIONS.map((sz) => (
                <label key={sz} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(form as any).sizes?.includes(sz)}
                    onChange={(e) => {
                      const next = new Set<string>((form as any).sizes ?? []);
                      if (e.target.checked) next.add(sz);
                      else next.delete(sz);
                      setForm((f: any) => ({ ...f, sizes: Array.from(next) }));
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-800">{sz}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Available colors</label>
            <p className="text-xs text-gray-500 mb-2">Comma-separated (e.g. Black, White, Navy). Leave empty if not applicable.</p>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={(form as any).colors_text}
              onChange={(e) => setForm((f: any) => ({ ...f, colors_text: e.target.value }))}
              placeholder="Black, White, Navy"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Product image</label>
            <p className="text-xs text-gray-500 mb-3">
              Upload a file (JPG, PNG, GIF, WebP — max 5MB) or paste a URL below. Uploading replaces the URL for this save.
            </p>
            {imagePreviewUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 w-full max-w-md mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Product preview"
                  className="w-full h-44 object-cover bg-gray-100"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={clearProductImage}
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
                  <p className="text-sm text-gray-600">Click to upload from your device</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP (max 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Or paste image URL</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
              value={form.image_url}
              onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
              placeholder="https://… (optional if you upload a file)"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. T-Shirts"
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
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(e) => setForm((f) => ({ ...f, in_stock: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">In stock</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              <span className="text-sm font-semibold text-gray-800">Active on storefront</span>
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
            {saving ? "Saving…" : editingId != null ? "Update product" : "Add product"}
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
                <th className="px-6 py-3 font-bold text-gray-600">Product</th>
                <th className="px-6 py-3 font-bold text-gray-600">Price</th>
                <th className="px-6 py-3 font-bold text-gray-600">Status</th>
                <th className="px-6 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-6 py-8 text-gray-600" colSpan={4}>
                    No products yet. Add one using the form above.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={row.image_url} alt="" className="w-14 h-14 rounded object-cover bg-gray-100" />
                        <div>
                          <div className="font-semibold text-gray-900">{row.name}</div>
                          <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{row.short_description || "—"}</div>
                          <div className="text-xs text-gray-500 mt-1">{row.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-800 font-semibold whitespace-nowrap">
                      KSh {row.price_kes.toLocaleString()}
                      {row.original_price_kes != null && (
                        <span className="ml-2 text-gray-400 line-through font-normal text-xs">
                          {row.original_price_kes.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-bold ${
                            row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {row.is_active ? "Active" : "Hidden"}
                        </span>
                        <span className={`text-xs ${row.in_stock ? "text-gray-600" : "text-amber-700 font-semibold"}`}>
                          {row.in_stock ? "In stock" : "Out of stock"}
                        </span>
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
                          onClick={() => handleDelete(row.id, row.name)}
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
