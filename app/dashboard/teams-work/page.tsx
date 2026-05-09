"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, Filter, Loader2, Send, UploadCloud, XCircle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type Attachment = {
  id: string;
  entry_id: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

type Entry = {
  id: string;
  user_id: string;
  user_email: string | null;
  entry_type: "daily_log" | "upload";
  title: string | null;
  body: string | null;
  work_date: string;
  status: "submitted" | "verified" | "needs_changes" | "rejected";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
};

function statusTone(status: Entry["status"]) {
  if (status === "verified") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "needs_changes") return "bg-amber-50 text-amber-900 border-amber-200";
  if (status === "rejected") return "bg-red-50 text-red-800 border-red-200";
  return "bg-slate-50 text-slate-800 border-slate-200";
}

function formatBytes(n: number | null) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "—";
  const kb = v / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DashboardTeamsWorkPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isEmployer } = usePortal();

  const [tab, setTab] = useState<"me" | "admin">("me");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [adminEntries, setAdminEntries] = useState<Entry[]>([]);

  const [workDate, setWorkDate] = useState(todayYmd());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [adminStatus, setAdminStatus] = useState<string>("");
  const [adminUserId, setAdminUserId] = useState<string>("");

  const canUseAdminTab = isAdmin && !isEmployer;

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (isEmployer) {
      setError("Employers do not have access to Teams Work.");
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, isEmployer, router, user]);

  useEffect(() => {
    if (!canUseAdminTab && tab === "admin") setTab("me");
  }, [canUseAdminTab, tab]);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadMyEntries = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/teams-work/entries?scope=me&limit=60", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { entries?: Entry[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to load entries.");
    setEntries(Array.isArray(json.entries) ? json.entries : []);
  }, [getToken]);

  const loadAdminEntries = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const qs = new URLSearchParams();
    qs.set("scope", "all");
    qs.set("limit", "80");
    if (adminStatus.trim()) qs.set("status", adminStatus.trim());
    if (adminUserId.trim()) qs.set("user_id", adminUserId.trim());
    const res = await fetch(`/api/teams-work/entries?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { entries?: Entry[]; error?: string };
    if (!res.ok) throw new Error(json.error ?? "Failed to load admin entries.");
    setAdminEntries(Array.isArray(json.entries) ? json.entries : []);
  }, [adminStatus, adminUserId, getToken]);

  const refresh = useCallback(async () => {
    setError(null);
    setMessage(null);
    if (tab === "admin") {
      await loadAdminEntries();
    } else {
      await loadMyEntries();
    }
  }, [loadAdminEntries, loadMyEntries, tab]);

  useEffect(() => {
    if (loading) return;
    void refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load."));
  }, [loading, refresh]);

  const submitDailyLog = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch("/api/teams-work/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entry_type: "daily_log",
          work_date: workDate,
          title: title.trim() || null,
          body: body.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { entry?: Entry; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to submit.");
      setTitle("");
      setBody("");
      setMessage("Submitted.");
      await loadMyEntries();
    } finally {
      setBusy(false);
    }
  };

  const uploadForNewEntry = async (file: File) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      // Create placeholder upload entry first.
      const createRes = await fetch("/api/teams-work/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          entry_type: "upload",
          work_date: workDate,
          title: title.trim() || file.name.slice(0, 140),
          body: body.trim() || null,
        }),
      });
      const createJson = (await createRes.json().catch(() => ({}))) as { entry?: Entry; error?: string };
      if (!createRes.ok || !createJson.entry) throw new Error(createJson.error ?? "Failed to create upload entry.");

      const form = new FormData();
      form.set("file", file);
      const upRes = await fetch(`/api/teams-work/entries/${createJson.entry.id}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const upJson = (await upRes.json().catch(() => ({}))) as { attachment?: Attachment; error?: string };
      if (!upRes.ok) throw new Error(upJson.error ?? "Upload failed.");

      setTitle("");
      setBody("");
      setMessage("Uploaded.");
      await loadMyEntries();
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (entryId: string, status: Entry["status"]) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch(`/api/teams-work/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as { entry?: Entry; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed.");
      setMessage(`Marked as ${status.replace("_", " ")}.`);
      await loadAdminEntries();
    } finally {
      setBusy(false);
    }
  };

  const activeList = tab === "admin" ? adminEntries : entries;

  const submittedCount = useMemo(() => activeList.filter((e) => e.status === "submitted").length, [activeList]);
  const verifiedCount = useMemo(() => activeList.filter((e) => e.status === "verified").length, [activeList]);

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember) return null;

  return (
    <div className="text-left space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">Teams Work</h2>
          <p className="mt-1 text-gray-600 max-w-3xl">
            Submit daily updates or upload deliverables. Directors and CEOs can review everything in the admin view.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold text-gray-700 bg-white">
              <Calendar className="h-3.5 w-3.5" />
              {workDate}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold text-gray-700 bg-white">
              Submitted: {submittedCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-semibold text-gray-700 bg-white">
              Verified: {verifiedCount}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("me")}
            className={`rounded-md px-4 py-2 text-sm font-semibold border ${
              tab === "me" ? "bg-primary-700 text-white border-primary-700" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
            }`}
          >
            My submissions
          </button>
          {canUseAdminTab && (
            <button
              type="button"
              onClick={() => setTab("admin")}
              className={`rounded-md px-4 py-2 text-sm font-semibold border ${
                tab === "admin"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              }`}
            >
              Admin review
            </button>
          )}
          <button
            type="button"
            onClick={() => void refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : "Refresh failed."))}
            disabled={busy}
            className="rounded-md px-4 py-2 text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">{error}</div>}
      {message && <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800">{message}</div>}

      {tab === "me" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_rgba(2,6,23,0.06)] space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-gray-700">New submission</div>
              <div className="mt-1 text-xs text-gray-500">Daily log (text) or upload deliverable (file).</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-600">Work date</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title (optional)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 140))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Social Media Marketing: Campaign creatives + report"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Daily update (optional if uploading)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 12000))}
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="What you did today, deliverables, links, blockers, next steps…"
              />
              <div className="mt-1 text-xs text-gray-500 text-right">{body.length} / 12000</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => void submitDailyLog().catch((e: unknown) => setError(e instanceof Error ? e.message : "Submit failed."))}
                disabled={busy || body.trim().length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60"
                title={body.trim().length === 0 ? "Write a daily update first" : "Submit daily log"}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit daily log
              </button>

              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60">
                <UploadCloud className="h-4 w-4" />
                Upload deliverable
                <input
                  type="file"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    if (!f) return;
                    void uploadForNewEntry(f).catch((err: unknown) =>
                      setError(err instanceof Error ? err.message : "Upload failed.")
                    );
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {tab === "admin" && canUseAdminTab && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_6px_24px_rgba(2,6,23,0.06)] space-y-4">
          <div className="flex items-center gap-2 text-sm font-extrabold text-gray-700">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Status</label>
              <select
                value={adminStatus}
                onChange={(e) => setAdminStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="needs_changes">Needs changes</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-2">User ID (optional)</label>
              <input
                value={adminUserId}
                onChange={(e) => setAdminUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Paste a user's UUID to filter"
              />
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => void loadAdminEntries().catch((e: unknown) => setError(e instanceof Error ? e.message : "Load failed."))}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              Apply
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {activeList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
            No entries yet.
          </div>
        ) : (
          activeList.map((e) => (
            <div key={e.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(e.status)}`}>
                      {e.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">{e.work_date}</span>
                    {tab === "admin" && (
                      <span className="text-xs text-gray-500 break-all">user: {e.user_id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-base font-extrabold text-gray-900 break-words">
                    {e.title?.trim() ? e.title : e.entry_type === "upload" ? "Uploaded deliverable" : "Daily log"}
                  </div>
                  {e.body?.trim() ? (
                    <div className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{e.body}</div>
                  ) : null}
                  {e.admin_note?.trim() ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <strong className="font-semibold">Admin note:</strong> {e.admin_note}
                    </div>
                  ) : null}
                </div>

                {tab === "admin" && canUseAdminTab && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(e.id, "verified").catch((err: unknown) => setError(err instanceof Error ? err.message : "Update failed."))}
                      className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(e.id, "needs_changes").catch((err: unknown) => setError(err instanceof Error ? err.message : "Update failed."))}
                      className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      <Loader2 className="h-4 w-4" />
                      Needs changes
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void updateStatus(e.id, "rejected").catch((err: unknown) => setError(err instanceof Error ? err.message : "Update failed."))}
                      className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {(e.attachments?.length ?? 0) > 0 && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs font-extrabold uppercase tracking-widest text-gray-500">Attachments</div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {e.attachments.map((a) => (
                      <li key={a.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                        <a
                          href={a.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-primary-700 hover:text-primary-800 break-words"
                        >
                          {a.file_name ?? "Open file"}
                        </a>
                        <div className="mt-1 text-xs text-gray-500">
                          {a.mime_type ?? "file"} · {formatBytes(a.size_bytes)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

