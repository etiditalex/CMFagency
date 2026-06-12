"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { cmfaDesignationLabel, cmfaStatusLabel, cmfaTicketId } from "@/lib/cmfa-registration";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type RegistrationRow = {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  designation_label?: string;
  status: string;
  is_guest: boolean;
  parent_registration_id: string | null;
  checked_in_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
};

type StatusFilter = "pending" | "approved" | "rejected" | "all";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-amber-100 text-amber-900 border-amber-200";
  }
}

export default function GateCmfaApprovalsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("reports")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`/api/cmfa/registrations?status=${encodeURIComponent(filter)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        registrations?: RegistrationRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load registrations");
      setRows(Array.isArray(json.registrations) ? json.registrations : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load registrations");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return;
    loadRows();
  }, [authLoading, portalLoading, isAuthenticated, user, isPortalMember, hasFeature, loadRows]);

  const patchStatus = async (id: string, status: "approved" | "rejected") => {
    setPatchingId(id);
    setNotice(null);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch(`/api/cmfa/registrations/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        email_sent?: boolean;
        email_error?: string;
        registration?: RegistrationRow;
      };

      if (!res.ok) throw new Error(json.error ?? json.email_error ?? "Update failed");

      if (status === "approved") {
        setNotice(
          json.email_sent
            ? `Approved — complimentary ticket emailed to ${json.registration?.email ?? "registrant"}.`
            : `Approved, but email could not be sent: ${json.email_error ?? "unknown error"}.`
        );
      } else {
        setNotice("Registration rejected.");
      }

      await loadRows();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPatchingId(null);
    }
  };

  const downloadApproved = async () => {
    setDownloading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch("/api/cmfa/registrations/export?status=approved", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Download failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cmfa-approved-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return null;

  const pendingCount = filter === "pending" ? rows.length : undefined;

  return (
    <div className="text-left max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/gate"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gate scanner
          </Link>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">CMFA Registration Approvals</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review in-house CMFA registrations. Approving sends a complimentary QR ticket by email.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadApproved()}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary-200 bg-primary-50 hover:bg-primary-100 font-semibold text-primary-800 disabled:opacity-60"
          >
            <Download className={`w-4 h-4 ${downloading ? "animate-spin" : ""}`} />
            {downloading ? "Preparing…" : "Download approved CSV"}
          </button>
          <button
            type="button"
            onClick={() => loadRows()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-semibold text-gray-900 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              filter === s
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All" : cmfaStatusLabel(s)}
            {s === "pending" && pendingCount !== undefined && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {notice && (
        <div className="mt-4 p-4 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm">{notice}</div>
      )}
      {error && (
        <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-600">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-600" />
            Loading registrations…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-600">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-2 text-gray-400" />
            No {filter === "all" ? "" : filter} registrations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Ticket</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.name}</div>
                      {row.is_guest && (
                        <div className="text-xs text-gray-500 mt-0.5">Executive guest</div>
                      )}
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.email}</div>
                      {row.phone && <div className="text-gray-500">{row.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {row.designation_label ?? cmfaDesignationLabel(row.designation)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${statusBadgeClass(row.status)}`}
                      >
                        {cmfaStatusLabel(row.status)}
                      </span>
                      {row.checked_in_at && (
                        <div className="text-xs text-green-700 mt-1">
                          Checked in {new Date(row.checked_in_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{cmfaTicketId(row.reference)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {row.status === "pending" ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={patchingId === row.id}
                            onClick={() => patchStatus(row.id, "approved")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-60"
                          >
                            {patchingId === row.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={patchingId === row.id}
                            onClick={() => patchStatus(row.id, "rejected")}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold disabled:opacity-60"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
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
