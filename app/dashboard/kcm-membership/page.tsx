"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { CompositeMetricCard } from "@/components/dashboard/ui";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 10;

type MembershipStatus = "new" | "in_review" | "approved" | "rejected";

type Membership = {
  id: string;
  membership_number?: string | null;
  forum_attendance?: { fee_kes: number; attendee_type: string; paid_at: string | null } | null;
  first_name: string;
  second_name: string;
  contact: string;
  email: string;
  experience: string;
  fashion_category?: string | null;
  fashion_category_other?: string | null;
  payment_amount_kes: number;
  payment_confirmed: boolean;
  payment_status: "pending" | "success" | "failed";
  mpesa_receipt: string | null;
  paid_at?: string | null;
  account_status?: "active" | "inactive";
  profile_completed?: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    cover_url?: string | null;
    profile_category?: string | null;
    professional_title?: string | null;
    bio: string | null;
    portfolio_text?: string | null;
    social_instagram?: string | null;
    social_facebook?: string | null;
    social_tiktok?: string | null;
    social_x?: string | null;
    portfolio_item_count?: number;
    updated_at?: string | null;
  } | null;
  contributions?: {
    total_contributions_kes: number;
    pending_contributions_kes: number;
    successful_contributions_count: number;
    last_contribution_at: string | null;
  };
  status: MembershipStatus;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS: MembershipStatus[] = ["new", "in_review", "approved", "rejected"];

export default function DashboardKcmMembershipPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isManager, hasFeature } = usePortal();

  const [rows, setRows] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | MembershipStatus>("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const [regFeeDraft, setRegFeeDraft] = useState("");
  const [memberForumFeeDraft, setMemberForumFeeDraft] = useState("");
  const [nonMemberForumFeeDraft, setNonMemberForumFeeDraft] = useState("");
  const [regFeeLoading, setRegFeeLoading] = useState(false);
  const [regFeeSaving, setRegFeeSaving] = useState(false);
  const [regFeeMessage, setRegFeeMessage] = useState<string | null>(null);
  const [regFeeMessageIsError, setRegFeeMessageIsError] = useState(false);

  const loadRegistrationFee = useCallback(async () => {
    setRegFeeLoading(true);
    setRegFeeMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch("/api/fusion-xpress/kcm-registration-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        registration_fee_kes?: number;
        forum_member_fee_kes?: number;
        forum_non_member_fee_kes?: number;
        error?: string;
      };
      if (!res.ok) return;
      if (typeof json.registration_fee_kes === "number") setRegFeeDraft(String(json.registration_fee_kes));
      if (typeof json.forum_member_fee_kes === "number") setMemberForumFeeDraft(String(json.forum_member_fee_kes));
      if (typeof json.forum_non_member_fee_kes === "number") setNonMemberForumFeeDraft(String(json.forum_non_member_fee_kes));
    } finally {
      setRegFeeLoading(false);
    }
  }, []);

  const parseFeeDraft = (raw: string) => {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 1 || n > 1_000_000) return null;
    return n;
  };

  const saveRegistrationFee = async () => {
    const registrationFee = parseFeeDraft(regFeeDraft);
    const memberForumFee = parseFeeDraft(memberForumFeeDraft);
    const nonMemberForumFee = parseFeeDraft(nonMemberForumFeeDraft);
    if (registrationFee == null || memberForumFee == null || nonMemberForumFee == null) {
      setRegFeeMessage("Enter each amount between 1 and 1,000,000 KES.");
      setRegFeeMessageIsError(true);
      return;
    }
    setRegFeeSaving(true);
    setRegFeeMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch("/api/fusion-xpress/kcm-registration-settings", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_fee_kes: registrationFee,
          forum_member_fee_kes: memberForumFee,
          forum_non_member_fee_kes: nonMemberForumFee,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        registration_fee_kes?: number;
        forum_member_fee_kes?: number;
        forum_non_member_fee_kes?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not save fees.");
      if (typeof json.registration_fee_kes === "number") setRegFeeDraft(String(json.registration_fee_kes));
      if (typeof json.forum_member_fee_kes === "number") setMemberForumFeeDraft(String(json.forum_member_fee_kes));
      if (typeof json.forum_non_member_fee_kes === "number") setNonMemberForumFeeDraft(String(json.forum_non_member_fee_kes));
      setRegFeeMessage("Fees saved. New M-Pesa checkouts use these amounts.");
      setRegFeeMessageIsError(false);
    } catch (e: unknown) {
      setRegFeeMessage(e instanceof Error ? e.message : "Could not save fees.");
      setRegFeeMessageIsError(true);
    } finally {
      setRegFeeSaving(false);
    }
  };

  const load = async (status: "" | MembershipStatus = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }

      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "200");

      const res = await fetch(`/api/fusion-xpress/kcm-memberships?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        memberships?: Membership[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load KCM memberships.");
      setRows(json.memberships ?? []);
      setPage(0);
      setOpenId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load KCM memberships.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!hasFeature("kcm_membership")) {
      router.replace("/dashboard");
      return;
    }
    void load("");
    if (isAdmin || isManager) void loadRegistrationFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, isAdmin, isManager, user?.id, router]);

  const parseExportError = async (res: Response) => {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: string };
      return j.error ?? (text || "Export failed.");
    } catch {
      return text || "Export failed.";
    }
  };

  const downloadMembership = async (id: string, fileSafeName: string) => {
    setDownloadingId(id);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(`/api/fusion-xpress/kcm-memberships/${encodeURIComponent(id)}?format=xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await parseExportError(res));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kcm-member-${fileSafeName.replace(/[^\w\-]+/g, "_")}-${id.slice(0, 8)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAllMembersExcel = async () => {
    setDownloadingAll(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const params = new URLSearchParams();
      params.set("format", "xlsx");
      params.set("limit", "5000");
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/fusion-xpress/kcm-memberships?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await parseExportError(res));

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      const filterPart = statusFilter ? `-${statusFilter}` : "";
      a.download = `kcm-members-export${filterPart}-${stamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const resendRegistrationEmail = async (id: string, email: string) => {
    setResendingId(id);
    setError(null);
    setResendNotice(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(`/api/fusion-xpress/kcm-memberships/${encodeURIComponent(id)}/resend-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; membership_number?: string | null };
      if (!res.ok) throw new Error(json.error ?? "Could not resend the registration email.");
      if (json.membership_number) {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, membership_number: json.membership_number, status: "approved" } : row)));
      }
      setResendNotice(`Registration ID ${json.membership_number ?? ""} emailed to ${email}.`.replace(/\s+/g, " ").trim());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not resend the registration email.");
    } finally {
      setResendingId(null);
    }
  };

  const deleteMembership = async (id: string, displayLabel: string) => {
    const ok = window.confirm(
      `Permanently delete ${displayLabel}? This removes their membership record, portal profile, portfolio uploads metadata, wallet history, and sessions. This cannot be undone.`
    );
    if (!ok) return;

    setDeletingId(id);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(`/api/fusion-xpress/kcm-memberships/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to delete membership.");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete membership.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateStatus = async (id: string, status: MembershipStatus, reviewNotes: string) => {
    setSavingId(id);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const res = await fetch(`/api/fusion-xpress/kcm-memberships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, review_notes: reviewNotes }),
      });
      const json = (await res.json().catch(() => ({}))) as { membership?: Membership; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to update membership.");
      const updated = json.membership;
      if (!updated) return;
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...updated, membership_number: updated.membership_number ?? r.membership_number, forum_attendance: r.forum_attendance }
            : r
        )
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update membership.");
    } finally {
      setSavingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(() => rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE), [rows, safePage]);

  const summary = useMemo(() => {
    const counts: Record<MembershipStatus, number> = {
      new: 0,
      in_review: 0,
      approved: 0,
      rejected: 0,
    };
    for (const row of rows) counts[row.status] += 1;
    return counts;
  }, [rows]);

  if (authLoading || portalLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("kcm_membership")) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1a2332] md:text-2xl">KCM Membership</h2>
          <p className="mt-1 text-gray-600">
            Review Kenya Coast Models members whose payment succeeded. A registration ID is issued only after payment, and you can resend that ID by email with the membership card PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              const next = e.target.value as "" | MembershipStatus;
              setStatusFilter(next);
              void load(next);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void downloadAllMembersExcel()}
            disabled={loading || downloadingAll || downloadingId !== null}
            className="inline-flex items-center gap-2 rounded-md border border-primary-300 bg-primary-50 px-3 py-2 text-sm font-semibold text-primary-900 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className={`h-4 w-4 ${downloadingAll ? "animate-pulse" : ""}`} />
            {downloadingAll ? "Preparing…" : "Download Excel (all)"}
          </button>
          <button
            type="button"
            onClick={() => void load(statusFilter)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6">
        <CompositeMetricCard
          title="Memberships"
          value={(summary.new + summary.in_review + summary.approved + summary.rejected).toLocaleString()}
          featured
          rows={[
            { label: "New", value: summary.new.toLocaleString() },
            { label: "In review", value: summary.in_review.toLocaleString() },
            { label: "Approved", value: summary.approved.toLocaleString() },
            { label: "Rejected", value: summary.rejected.toLocaleString() },
          ]}
        />
      </div>

      {(isAdmin || isManager) ? (
      <div className="mt-6 rounded-lg border border-brand/30 bg-brand-muted p-4 md:p-5">
        <h3 className="text-sm font-bold text-brand-dark">KCM fees</h3>
        <p className="mt-1 text-xs text-brand-dark">
          These amounts are used for new M-Pesa prompts. Membership registration is the joining fee. Forum attendance is
          charged separately for existing members and for people joining as new members. Allowed range: 1–1,000,000 KES.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="kcm-reg-fee" className="block text-xs font-medium text-gray-700">
              Membership registration (KES)
            </label>
            <input
              id="kcm-reg-fee"
              type="number"
              min={1}
              max={1_000_000}
              value={regFeeDraft}
              onChange={(e) => setRegFeeDraft(e.target.value)}
              disabled={regFeeLoading || regFeeSaving}
              className="mt-0.5 w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="kcm-forum-member-fee" className="block text-xs font-medium text-gray-700">
              Forum fee, members (KES)
            </label>
            <input
              id="kcm-forum-member-fee"
              type="number"
              min={1}
              max={1_000_000}
              value={memberForumFeeDraft}
              onChange={(e) => setMemberForumFeeDraft(e.target.value)}
              disabled={regFeeLoading || regFeeSaving}
              className="mt-0.5 w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="kcm-forum-non-member-fee" className="block text-xs font-medium text-gray-700">
              Forum fee, new members (KES)
            </label>
            <input
              id="kcm-forum-non-member-fee"
              type="number"
              min={1}
              max={1_000_000}
              value={nonMemberForumFeeDraft}
              onChange={(e) => setNonMemberForumFeeDraft(e.target.value)}
              disabled={regFeeLoading || regFeeSaving}
              className="mt-0.5 w-44 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <button
            type="button"
            onClick={() => void saveRegistrationFee()}
            disabled={regFeeLoading || regFeeSaving || regFeeDraft === "" || memberForumFeeDraft === "" || nonMemberForumFeeDraft === ""}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {regFeeSaving ? "Saving..." : "Save fees"}
          </button>
        </div>
        {regFeeMessage ? (
          <p
            className={`mt-2 text-xs ${regFeeMessageIsError ? "text-red-700" : "text-green-800"}`}
          >
            {regFeeMessage}
          </p>
        ) : null}
      </div>
      ) : null}

      {error && <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {resendNotice ? (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{resendNotice}</div>
      ) : null}

      <div className="mt-6 overflow-hidden border border-hairline bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-4 py-3 text-left">
          <h3 className="text-left text-sm font-extrabold uppercase tracking-wide text-gray-900">Members</h3>
          {!loading && rows.length > 0 ? (
            <p className="text-xs text-gray-500">
              Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </p>
          ) : null}
        </div>
        {loading ? (
          <p className="p-12 text-center text-gray-500">Loading memberships...</p>
        ) : rows.length === 0 ? (
          <p className="p-12 text-center text-gray-500">No successful KCM payments yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
                <thead className="bg-[#f4f7fb]">
                  <tr>
                    {["Registration ID", "Name", "Contact", "Email", "Category", "Payment", "Forum", "Status", "Joined"].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const open = openId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr className={open ? "bg-secondary-50" : "odd:bg-white even:bg-slate-50/60"}>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-semibold text-gray-900">
                            <button type="button" onClick={() => setOpenId(open ? null : row.id)} className="hover:underline">
                              {row.membership_number?.trim() || "Pending"}
                            </button>
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left font-medium text-gray-900">
                            {row.first_name} {row.second_name}
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.contact}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{row.email}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">{registrationFashionCategoryLabel(row)}</td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            {row.payment_confirmed ? `KES ${Number(row.payment_amount_kes ?? 0).toLocaleString()}` : row.payment_status}
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            {row.forum_attendance ? `Paid KES ${Number(row.forum_attendance.fee_kes).toLocaleString()}` : "—"}
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            <div className="capitalize">{row.status.replace("_", " ")}</div>
                            {row.payment_status === "success" && row.status !== "approved" ? (
                              <button
                                type="button"
                                onClick={() => void updateStatus(row.id, "approved", row.review_notes ?? "")}
                                disabled={savingId === row.id}
                                className="mt-1 rounded-md bg-primary-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingId === row.id ? "Approving…" : "Approve"}
                              </button>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap border-b border-hairline px-4 py-3 text-left">
                            {new Date(row.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                        {open ? (
                          <tr className="bg-secondary-50">
                            <td colSpan={9} className="border-b border-hairline px-4 py-4 text-left">
                              <Row
                                key={`${row.id}-${row.status}-${row.review_notes ?? ""}`}
                                row={row}
                                disabled={savingId === row.id}
                                onSave={(status, reviewNotes) => updateStatus(row.id, status, reviewNotes)}
                                onDownload={() =>
                                  void downloadMembership(row.id, `${row.first_name}-${row.second_name}`.trim() || row.email)
                                }
                                onDelete={() =>
                                  void deleteMembership(row.id, `${row.first_name} ${row.second_name}`.trim() || row.email)
                                }
                                onResend={() => void resendRegistrationEmail(row.id, row.email)}
                                downloadBusy={downloadingId === row.id || downloadingAll}
                                deleteBusy={deletingId === row.id || downloadingAll}
                                resendBusy={resendingId === row.id}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > PAGE_SIZE ? (
              <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-gray-600">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => {
                    setOpenId(null);
                    setPage((current) => Math.max(0, current - 1));
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => {
                    setOpenId(null);
                    setPage((current) => Math.min(pageCount - 1, current + 1));
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function registrationFashionCategoryLabel(row: Membership): string {
  const c = row.fashion_category?.trim();
  if (!c) return "—";
  if (c.toLowerCase() === "other") {
    const custom = row.fashion_category_other?.trim();
    if (custom) return custom;
    return "Other";
  }
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function socialLink(label: string, value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  const isUrl = /^https?:\/\//i.test(raw);
  return (
    <div className="flex flex-wrap gap-x-1 text-[10px]">
      <span className="font-semibold text-gray-600">{label}:</span>
      {isUrl ? (
        <a href={raw} target="_blank" rel="noopener noreferrer" className="break-all text-secondary-700 underline">
          {raw}
        </a>
      ) : (
        <span className="break-all text-gray-700">{raw}</span>
      )}
    </div>
  );
}

function Row({
  row,
  disabled,
  onSave,
  onDownload,
  onDelete,
  onResend,
  downloadBusy,
  deleteBusy,
  resendBusy,
}: {
  row: Membership;
  disabled: boolean;
  onSave: (status: MembershipStatus, reviewNotes: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onResend: () => void;
  downloadBusy: boolean;
  deleteBusy: boolean;
  resendBusy: boolean;
}) {
  const [status, setStatus] = useState<MembershipStatus>(row.status);
  const [reviewNotes, setReviewNotes] = useState(row.review_notes ?? "");

  return (
    <div className="grid gap-4 text-left lg:grid-cols-2">
      <div>
        <div className="font-semibold text-gray-900">{row.first_name} {row.second_name}</div>
        <div className="text-xs text-gray-500">{row.membership_number?.trim() || "Registration ID is issued after a successful payment"}</div>
        <div className="text-xs text-gray-500">{row.email}</div>
        <div className="text-xs text-gray-400">{new Date(row.created_at).toLocaleString()}</div>
        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          row.account_status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {row.account_status ?? "inactive"}
        </div>
        {row.forum_attendance ? (
          <p className="mt-2 text-xs text-gray-700">
            Forum attendance paid: KES {Number(row.forum_attendance.fee_kes).toLocaleString()} as {row.forum_attendance.attendee_type}.
          </p>
        ) : null}
      </div>
      <div className="max-w-md">
        <div className="flex gap-2">
          <div className="flex shrink-0 flex-col gap-1">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
              {row.profile?.avatar_url ? (
                <Image src={row.profile.avatar_url} alt={`${row.first_name} avatar`} fill className="object-cover" />
              ) : null}
            </div>
            <div className="relative h-10 w-24 overflow-hidden rounded border border-gray-200 bg-gray-100">
              {row.profile?.cover_url ? (
                <Image src={row.profile.cover_url} alt="" fill className="object-cover" sizes="96px" />
              ) : (
                <span className="flex h-full items-center justify-center text-[9px] text-gray-400">No cover</span>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="truncate text-xs font-semibold text-gray-700">
              {row.profile?.display_name || "No display name"}
            </div>
            <div className="text-[11px] text-gray-500">
              {row.profile_completed ? "Profile set up" : "Profile pending"}
              {row.profile?.updated_at ? (
                <span className="block text-[10px] text-gray-400">
                  Portal profile updated: {new Date(row.profile.updated_at).toLocaleString()}
                </span>
              ) : null}
            </div>
            {row.profile?.profile_category ? (
              <div className="text-[10px] uppercase tracking-wide text-secondary-700">
                {String(row.profile.profile_category).replace(/_/g, " ")}
              </div>
            ) : null}
            {row.profile?.professional_title ? (
              <div className="line-clamp-2 text-[10px] text-gray-600">{row.profile.professional_title}</div>
            ) : null}
            {row.profile?.bio?.trim() ? (
              <div>
                <div className="text-[10px] font-semibold text-gray-600">Bio</div>
                <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-[10px] leading-snug text-gray-700">
                  {row.profile.bio}
                </p>
              </div>
            ) : null}
            {row.profile?.portfolio_text?.trim() ? (
              <div>
                <div className="text-[10px] font-semibold text-gray-600">Written portfolio</div>
                <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px] leading-snug text-gray-700">
                  {row.profile.portfolio_text}
                </p>
              </div>
            ) : null}
            {(row.profile?.portfolio_item_count ?? 0) > 0 ? (
              <div className="text-[10px] text-gray-600">
                {row.profile?.portfolio_item_count} portfolio file(s) — URLs in Excel export
              </div>
            ) : null}
            <div className="space-y-0.5 border-t border-gray-100 pt-1">
              {socialLink("Instagram", row.profile?.social_instagram)}
              {socialLink("Facebook", row.profile?.social_facebook)}
              {socialLink("TikTok", row.profile?.social_tiktok)}
              {socialLink("X", row.profile?.social_x)}
            </div>
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-700">
        <p><span className="font-semibold text-gray-900">Contact:</span> {row.contact}</p>
        <p className="mt-1"><span className="font-semibold text-gray-900">Category:</span> {registrationFashionCategoryLabel(row)}</p>
        <p className="mt-1"><span className="font-semibold text-gray-900">Experience:</span> {row.experience}</p>
      </div>
      <div className="text-gray-700">
        <div>{row.payment_confirmed ? `KES ${Number(row.payment_amount_kes ?? 0).toLocaleString()}` : "Not confirmed"}</div>
        <div className="text-xs text-gray-500">Status: {row.payment_status}</div>
        {row.paid_at ? (
          <div className="text-xs text-gray-500">Paid at: {new Date(row.paid_at).toLocaleString()}</div>
        ) : null}
        {row.mpesa_receipt ? <div className="text-xs text-gray-400">Receipt: {row.mpesa_receipt}</div> : null}
        <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px]">
          <div className="font-semibold text-gray-700">
            Wallet total: KES {Number(row.contributions?.total_contributions_kes ?? 0).toLocaleString()}
          </div>
          <div className="text-gray-500">
            Pending: KES {Number(row.contributions?.pending_contributions_kes ?? 0).toLocaleString()}
          </div>
          <div className="text-gray-500">
            Contributions: {Number(row.contributions?.successful_contributions_count ?? 0)}
          </div>
          {row.contributions?.last_contribution_at ? (
            <div className="text-gray-400">Last: {new Date(row.contributions.last_contribution_at).toLocaleString()}</div>
          ) : null}
        </div>
      </div>
      <div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MembershipStatus)}
          disabled={disabled}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs font-semibold text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          className="w-52 rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          rows={3}
          placeholder="Optional notes..."
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => onSave(status, reviewNotes)}
          disabled={disabled}
          className="mt-2 rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {disabled ? "Saving..." : "Save"}
        </button>
        {row.payment_status === "success" && row.status !== "approved" ? (
          <button
            type="button"
            onClick={() => onSave("approved", reviewNotes)}
            disabled={disabled}
            className="mt-2 ml-2 rounded-md bg-secondary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled ? "Approving…" : "Approve & send card"}
          </button>
        ) : null}
      </div>
      <div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResend}
            disabled={downloadBusy || deleteBusy || resendBusy || row.payment_status !== "success"}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-secondary-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-secondary-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail className="h-3.5 w-3.5" />
            {resendBusy ? "Sending…" : "Resend registration ID"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloadBusy || deleteBusy || resendBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            {downloadBusy ? "Downloading…" : "Download Excel"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={downloadBusy || deleteBusy || resendBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleteBusy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
