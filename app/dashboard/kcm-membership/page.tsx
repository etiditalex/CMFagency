"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import Image from "next/image";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type MembershipStatus = "new" | "in_review" | "approved" | "rejected";

type Membership = {
  id: string;
  first_name: string;
  second_name: string;
  contact: string;
  email: string;
  experience: string;
  top_model_interest: boolean;
  payment_amount_kes: number;
  payment_confirmed: boolean;
  payment_status: "pending" | "success" | "failed";
  mpesa_receipt: string | null;
  account_status?: "active" | "inactive";
  profile_completed?: boolean;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    portfolio_text?: string | null;
    portfolio_item_count?: number;
  } | null;
  status: MembershipStatus;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS: MembershipStatus[] = ["new", "in_review", "approved", "rejected"];

export default function DashboardKcmMembershipPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isManager } = usePortal();

  const [rows, setRows] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | MembershipStatus>("");

  const [regFeeDraft, setRegFeeDraft] = useState("");
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
      const json = (await res.json().catch(() => ({}))) as { registration_fee_kes?: number; error?: string };
      if (!res.ok) return;
      if (typeof json.registration_fee_kes === "number") setRegFeeDraft(String(json.registration_fee_kes));
    } finally {
      setRegFeeLoading(false);
    }
  }, []);

  const saveRegistrationFee = async () => {
    const n = Math.floor(Number(regFeeDraft));
    if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
      setRegFeeMessage("Enter an amount between 1 and 1,000,000 KES.");
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
        body: JSON.stringify({ registration_fee_kes: n }),
      });
      const json = (await res.json().catch(() => ({}))) as { registration_fee_kes?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not save registration fee.");
      if (typeof json.registration_fee_kes === "number") setRegFeeDraft(String(json.registration_fee_kes));
      setRegFeeMessage("Registration fee saved. New checkouts use this amount.");
      setRegFeeMessageIsError(false);
    } catch (e: unknown) {
      setRegFeeMessage(e instanceof Error ? e.message : "Could not save registration fee.");
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
    if (!isAdmin && !isManager) {
      router.replace("/dashboard");
      return;
    }
    void load("");
    void loadRegistrationFee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, isAdmin, isManager, user?.id, router]);

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
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update membership.");
    } finally {
      setSavingId(null);
    }
  };

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

  if (!isAuthenticated || !user || !isPortalMember || (!isAdmin && !isManager)) return null;

  return (
    <div className="text-left">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 md:text-2xl">KCM Membership</h2>
          <p className="mt-1 text-gray-600">Review and manage Kenya Coast Models membership registrations.</p>
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
            onClick={() => void load(statusFilter)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">New</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{summary.new}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">In review</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{summary.in_review}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Approved</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{summary.approved}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Rejected</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{summary.rejected}</div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-primary-200 bg-primary-50/90 p-4 md:p-5">
        <h3 className="text-sm font-bold text-primary-950">KCM registration fee</h3>
        <p className="mt-1 text-xs text-primary-900">
          This amount is used for new M-Pesa STK prompts and stored on each membership record. Allowed range: 1–1,000,000
          KES.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="kcm-reg-fee" className="block text-xs font-medium text-gray-700">
              Amount (KES)
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
          <button
            type="button"
            onClick={() => void saveRegistrationFee()}
            disabled={regFeeLoading || regFeeSaving || regFeeDraft === ""}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {regFeeSaving ? "Saving..." : "Save fee"}
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

      {error && <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mt-6 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3 font-bold text-gray-600">Name</th>
              <th className="px-4 py-3 font-bold text-gray-600">Profile</th>
              <th className="px-4 py-3 font-bold text-gray-600">Contact</th>
              <th className="px-4 py-3 font-bold text-gray-600">Experience</th>
              <th className="px-4 py-3 font-bold text-gray-600">Top model</th>
              <th className="px-4 py-3 font-bold text-gray-600">Payment</th>
              <th className="px-4 py-3 font-bold text-gray-600">Status</th>
              <th className="px-4 py-3 font-bold text-gray-600">Review notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Loading memberships...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No KCM membership submissions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <Row
                  key={row.id}
                  row={row}
                  disabled={savingId === row.id}
                  onSave={(status, reviewNotes) => updateStatus(row.id, status, reviewNotes)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  disabled,
  onSave,
}: {
  row: Membership;
  disabled: boolean;
  onSave: (status: MembershipStatus, reviewNotes: string) => void;
}) {
  const [status, setStatus] = useState<MembershipStatus>(row.status);
  const [reviewNotes, setReviewNotes] = useState(row.review_notes ?? "");

  useEffect(() => {
    setStatus(row.status);
    setReviewNotes(row.review_notes ?? "");
  }, [row.status, row.review_notes]);

  return (
    <tr className="border-b border-gray-100 align-top">
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-900">{row.first_name} {row.second_name}</div>
        <div className="text-xs text-gray-500">{row.email}</div>
        <div className="text-xs text-gray-400">{new Date(row.created_at).toLocaleString()}</div>
        <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          row.account_status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {row.account_status ?? "inactive"}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
            {row.profile?.avatar_url ? (
              <Image src={row.profile.avatar_url} alt={`${row.first_name} avatar`} fill className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-gray-700">
              {row.profile?.display_name || "No display name"}
            </div>
            <div className="text-[11px] text-gray-500">
              {row.profile_completed ? "Profile set up" : "Profile pending"}
            </div>
            {(row.profile?.portfolio_item_count ?? 0) > 0 || row.profile?.portfolio_text?.trim() ? (
              <div className="mt-1 text-[10px] leading-snug text-gray-500">
                {(row.profile?.portfolio_item_count ?? 0) > 0 ? (
                  <span>{row.profile?.portfolio_item_count} portfolio file(s)</span>
                ) : null}
                {(row.profile?.portfolio_item_count ?? 0) > 0 && row.profile?.portfolio_text?.trim() ? " · " : null}
                {row.profile?.portfolio_text?.trim() ? <span>Written portfolio</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700">{row.contact}</td>
      <td className="max-w-xs px-4 py-3 text-gray-700">
        <p className="line-clamp-4">{row.experience}</p>
      </td>
      <td className="px-4 py-3 text-gray-700">{row.top_model_interest ? "Yes" : "No"}</td>
      <td className="px-4 py-3 text-gray-700">
        <div>{row.payment_confirmed ? `KES ${Number(row.payment_amount_kes ?? 0).toLocaleString()}` : "Not confirmed"}</div>
        <div className="text-xs text-gray-500">Status: {row.payment_status}</div>
        {row.mpesa_receipt ? <div className="text-xs text-gray-400">Receipt: {row.mpesa_receipt}</div> : null}
      </td>
      <td className="px-4 py-3">
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
      </td>
      <td className="px-4 py-3">
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
      </td>
    </tr>
  );
}
