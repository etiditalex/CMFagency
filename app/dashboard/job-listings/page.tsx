"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";

type Listing = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  description: string;
  requirements: unknown;
  benefits: unknown;
  contact_email: string | null;
  status: string;
  created_at: string;
};

const EMPLOYMENT_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "attachment", label: "Industrial attachment" },
];

function linesFromJson(val: unknown): string {
  if (!Array.isArray(val)) return "";
  return val.map((x) => String(x)).join("\n");
}

export default function DashboardJobListingsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    title: "",
    company_name: "",
    location: "",
    employment_type: "full_time",
    salary_text: "",
    summary: "",
    description: "",
    requirements_text: "",
    benefits_text: "",
    contact_email: "",
    status: "draft" as "draft" | "published" | "closed",
  };

  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in");
        setListings([]);
        return;
      }
      const res = await fetch("/api/fusion-xpress/job-listings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Failed to load");
        setListings([]);
        return;
      }
      setListings(Array.isArray(j.listings) ? j.listings : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (row: Listing) => {
    setEditingId(row.id);
    setShowForm(true);
    setForm({
      title: row.title,
      company_name: row.company_name,
      location: row.location ?? "",
      employment_type: row.employment_type,
      salary_text: row.salary_text ?? "",
      summary: row.summary ?? "",
      description: row.description ?? "",
      requirements_text: linesFromJson(row.requirements),
      benefits_text: linesFromJson(row.benefits),
      contact_email: row.contact_email ?? "",
      status: (row.status as "draft" | "published" | "closed") || "draft",
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const submitForm = async () => {
    setSaving(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not signed in");
        return;
      }

      const requirements = form.requirements_text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      const benefits = form.benefits_text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

      const payload = {
        title: form.title,
        company_name: form.company_name,
        location: form.location || null,
        employment_type: form.employment_type,
        salary_text: form.salary_text || null,
        summary: form.summary || null,
        description: form.description,
        requirements,
        benefits,
        contact_email: form.contact_email || null,
        status: form.status,
      };

      const url = editingId
        ? `/api/fusion-xpress/job-listings/${encodeURIComponent(editingId)}`
        : "/api/fusion-xpress/job-listings";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Save failed");
        return;
      }
      await load();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this vacancy?")) return;
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/fusion-xpress/job-listings/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.error === "string" ? j.error : "Delete failed");
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const quickStatus = async (id: string, status: string) => {
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`/api/fusion-xpress/job-listings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Update failed");
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Job board listings</h2>
            <p className="mt-1 text-gray-600 text-sm max-w-3xl">
              Publish roles for members. Internship and industrial attachment posts are visible to everyone; other types
              require an active KES&nbsp;500/year job-board membership to view full details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 text-white px-4 py-2.5 font-semibold hover:bg-primary-700"
          >
            <Plus className="w-5 h-5" />
            New vacancy
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        )}

        {showForm && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50/80 p-4 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">{editingId ? "Edit vacancy" : "Create vacancy"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / organisation *</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment type *</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.employment_type}
                  onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
                >
                  {EMPLOYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary / stipend (text)</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.salary_text}
                  onChange={(e) => setForm((f) => ({ ...f, salary_text: e.target.value }))}
                  placeholder="e.g. KES 80,000 – 120,000 or Unpaid"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  value={form.contact_email}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Short summary (public list)</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full description *</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[140px]"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements (one per line)</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[100px] font-mono text-sm"
                  value={form.requirements_text}
                  onChange={(e) => setForm((f) => ({ ...f, requirements_text: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benefits (one per line)</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[100px] font-mono text-sm"
                  value={form.benefits_text}
                  onChange={(e) => setForm((f) => ({ ...f, benefits_text: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as "draft" | "published" | "closed" }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={submitForm}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2 font-semibold hover:bg-black disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Save changes" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading…
            </div>
          ) : listings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No vacancies yet. Create one to show on the public job board.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-3 font-semibold text-gray-700">Title</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Company</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                    <th className="text-right p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="p-3 font-medium text-gray-900">{row.title}</td>
                      <td className="p-3 text-gray-700">{row.company_name}</td>
                      <td className="p-3 text-gray-600">{row.employment_type.replace("_", " ")}</td>
                      <td className="p-3">
                        <span
                          className={
                            row.status === "published"
                              ? "text-green-700 font-medium"
                              : row.status === "draft"
                                ? "text-amber-700 font-medium"
                                : "text-gray-600"
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1 whitespace-nowrap">
                        {row.status !== "published" && (
                          <button
                            type="button"
                            onClick={() => quickStatus(row.id, "published")}
                            className="text-primary-600 font-medium hover:underline text-xs"
                          >
                            Publish
                          </button>
                        )}
                        {row.status === "published" && (
                          <button
                            type="button"
                            onClick={() => quickStatus(row.id, "closed")}
                            className="text-gray-600 font-medium hover:underline text-xs"
                          >
                            Close
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="inline-flex items-center gap-1 text-primary-600 font-medium hover:underline text-xs ml-2"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row.id)}
                          className="inline-flex items-center gap-1 text-red-600 font-medium hover:underline text-xs ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
