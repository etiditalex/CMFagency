"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone,
  RefreshCw,
  FileText,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type Application = {
  id: string;
  cmf_agency_id: string;
  user_id: string | null;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  name: string | null;
  full_name: string | null;
  application_type: string;
  job_position: string | null;
  status: string;
  personal_details: Record<string, unknown> | null;
  documents: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = ["pending", "under review", "accepted", "rejected"] as const;
const TYPE_OPTIONS = ["job", "internship", "attachment", "event"] as const;

export default function DashboardApplicationsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Not logged in");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("application_type", typeFilter);
      params.set("limit", "100");
      const res = await fetch(`/api/fusion-xpress/applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error ?? `Failed to load applications (${res.status})`);
        setApplications([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setApplications(json.applications ?? []);
      setTotal(json.total ?? json.applications?.length ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load applications";
      setError(msg);
      setApplications([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
      return;
    }
    loadApplications();
  }, [
    authLoading,
    isAuthenticated,
    isAdmin,
    isPortalMember,
    portalLoading,
    loadApplications,
    router,
    user,
  ]);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/fusion-xpress/applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Update status failed:", json.error);
        return;
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, updated_at: (json.application as Application)?.updated_at ?? a.updated_at } : a))
      );
    } catch (e: unknown) {
      console.error("Update status error:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    const notes = notesDraft[id] ?? applications.find((a) => a.id === id)?.notes ?? "";
    setUpdatingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch(`/api/fusion-xpress/applications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: notes || null }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Save notes failed:", json.error);
        return;
      }
      setApplications((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, notes: notes || null, updated_at: (json.application as Application)?.updated_at ?? a.updated_at } : a
        )
      );
      setEditingNotesId(null);
      setNotesDraft((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    } catch (e: unknown) {
      console.error("Save notes error:", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      "under review": "bg-blue-100 text-blue-800 border-blue-200",
      accepted: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const s = styles[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${s}`}>
        {status || "pending"}
      </span>
    );
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !isAdmin) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">
            Job Applications
          </h2>
          <p className="mt-1 text-gray-600 max-w-3xl">
            View and manage job, internship, and attachment applications. Update status and add internal notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadApplications()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Loading applications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => loadApplications()}
              className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No applications yet</p>
            <p className="mt-1 text-sm">
              Applications submitted via the careers form will appear here.
            </p>
            <Link
              href="/application"
              className="mt-4 inline-block text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              View application form →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        {app.cmf_agency_id}
                      </span>
                      {statusBadge(app.status)}
                      <span className="text-xs text-gray-500 capitalize">
                        {app.application_type}
                      </span>
                      {app.job_position && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {app.job_position}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatDate(app.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        disabled={updatingId === app.id}
                        className="px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <Link
                        href="/track-application"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
                        title="View public tracking page (applicants use CMF ID to track)"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Track
                      </Link>
                      <button
                        type="button"
                        onClick={() => setExpandedId((x) => (x === app.id ? null : app.id))}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        {expandedId === app.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        Details
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      {app.name || app.full_name || "—"}
                    </span>
                    {app.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {app.email}
                      </span>
                    )}
                    {app.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {app.phone}
                      </span>
                    )}
                  </div>

                  {expandedId === app.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 text-sm">
                      {app.personal_details && Object.keys(app.personal_details).length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-gray-700 mb-1">
                            <FileText className="w-4 h-4" />
                            Personal details
                          </div>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap font-sans">
                            {JSON.stringify(app.personal_details, null, 2)}
                          </pre>
                        </div>
                      )}
                      {app.documents && Object.keys(app.documents).length > 0 && (
                        <div>
                          <div className="font-semibold text-gray-700 mb-1">Documents</div>
                          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-24 whitespace-pre-wrap font-sans">
                            {JSON.stringify(app.documents, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-700 mb-1">Internal notes</div>
                        {editingNotesId === app.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={notesDraft[app.id] ?? app.notes ?? ""}
                              onChange={(e) => setNotesDraft((d) => ({ ...d, [app.id]: e.target.value }))}
                              rows={3}
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                              placeholder="Add notes..."
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveNotes(app.id)}
                                disabled={updatingId === app.id}
                                className="px-3 py-1.5 rounded bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNotesId(null);
                                  setNotesDraft((d) => {
                                    const next = { ...d };
                                    delete next[app.id];
                                    return next;
                                  });
                                }}
                                className="px-3 py-1.5 rounded border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-gray-600 whitespace-pre-wrap flex-1 min-w-0">
                              {app.notes || <span className="text-gray-400">No notes</span>}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesId(app.id);
                                setNotesDraft((d) => ({ ...d, [app.id]: app.notes ?? "" }));
                              }}
                              className="shrink-0 px-2 py-1 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              {app.notes ? "Edit" : "Add notes"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Showing {applications.length} of {total} application{total !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
