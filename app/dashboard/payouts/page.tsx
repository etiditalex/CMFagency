"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, Smartphone, Wallet, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { getAccessTokenForApi } from "@/lib/get-access-token-for-api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";

type Balance = {
  mpesa: number;
  paystack: number;
  mpesaAvailable: number;
  mpesaPendingApproval?: number;
  mpesaInTransit?: number;
  mpesaPaidOut?: number;
  scope?: string;
};
type Withdrawal = {
  id: string;
  amount: number;
  currency: string;
  recipient_phone: string;
  status: string;
  created_at: string;
  approved_at?: string | null;
  created_by?: string;
  metadata?: Record<string, unknown>;
};

function formatKes(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function DashboardPayoutsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isFullAdmin } = usePortal();

  const [balance, setBalance] = useState<Balance | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const token = await getAccessTokenForApi();
    if (!token) {
      setError("Session expired. Refresh the page or sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [balRes, wdRes] = await Promise.all([
        fetch("/api/wallet/balance", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/wallet/withdrawals", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const balJson = (await balRes.json()) as Balance & { error?: string };
      const wdJson = (await wdRes.json()) as { withdrawals?: Withdrawal[]; error?: string };

      if (!balRes.ok) throw new Error(balJson.error ?? "Failed to load balance");
      if (!wdRes.ok) throw new Error(wdJson.error ?? "Failed to load withdrawals");

      setBalance({
        mpesa: balJson.mpesa ?? 0,
        paystack: balJson.paystack ?? 0,
        mpesaAvailable: balJson.mpesaAvailable ?? 0,
        mpesaPendingApproval: balJson.mpesaPendingApproval ?? 0,
        mpesaInTransit: balJson.mpesaInTransit ?? 0,
        mpesaPaidOut: balJson.mpesaPaidOut ?? 0,
        scope: balJson.scope ?? "owned_campaigns",
      });
      setWithdrawals(wdJson.withdrawals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("payouts")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  useEffect(() => {
    if (!user || !isPortalMember || !hasFeature("payouts")) return;
    fetchData();
  }, [user, isPortalMember, hasFeature, fetchData]);

  useEffect(() => {
    if (!isPortalMember || !user?.id) return;
    const channel = supabase
      .channel(`payouts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isPortalMember, user?.id, fetchData]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || submitting) return;
    const token = await getAccessTokenForApi();
    if (!token) {
      setSubmitError("Session expired. Refresh the page or sign in again.");
      return;
    }

    const amount = Math.trunc(Number(withdrawAmount));
    if (!Number.isFinite(amount) || amount < 10) {
      setSubmitError("Amount must be at least 10 KES");
      return;
    }
    if (!withdrawPhone.trim()) {
      setSubmitError("M-Pesa number is required");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount, recipient_phone: withdrawPhone.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSubmitError(json.error ?? "Request failed");
        return;
      }
      setWithdrawAmount("");
      setWithdrawPhone("");
      fetchData();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const token = await getAccessTokenForApi();
    if (!token) {
      setError("Session expired. Refresh the page or sign in again.");
      return;
    }

    setApprovingId(id);
    try {
      const res = await fetch(`/api/wallet/withdrawals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const token = await getAccessTokenForApi();
    if (!token) {
      setError("Session expired. Refresh the page or sign in again.");
      return;
    }

    setRejectingId(id);
    try {
      const res = await fetch(`/api/wallet/withdrawals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "reject" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error);
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rejection failed");
    } finally {
      setRejectingId(null);
    }
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember) return null;
  if (!hasFeature("payouts")) return null;

  const pendingAdmin = withdrawals.filter((w) => w.status === "pending_admin");
  const stuckWithdrawals = withdrawals.filter((w) =>
    ["processing", "approved"].includes(w.status)
  );
  const myWithdrawals = isFullAdmin ? withdrawals : withdrawals.filter((w) => !w.created_by || w.created_by === user.id);

  const statusBadge = (s: string) => {
    const c =
      s === "completed" ? "bg-green-100 text-green-800 border-green-200" :
      s === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
      s === "processing" || s === "approved" ? "bg-amber-100 text-amber-800 border-amber-200" :
      "bg-gray-100 text-gray-800 border-gray-200";
    return (
      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold border ${c}`}>
        {s.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Payouts</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-semibold"
          >
            View campaigns
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : (
        <>
          {/* Wallet balances */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 text-primary-700 font-extrabold">
                <Smartphone className="w-5 h-5" />
                M-Pesa total received
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                KES {formatKes(balance?.mpesa ?? 0)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Available for withdrawal: <span className="font-semibold">KES {formatKes(balance?.mpesaAvailable ?? 0)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Scope: {balance?.scope === "visible_campaigns" ? "all campaigns visible to your account" : "owned campaigns only"}.
              </div>
            </div>
            <div className="bg-white rounded-md shadow-sm p-6 border border-gray-200">
              <div className="flex items-center gap-2 text-primary-700 font-extrabold">
                <Wallet className="w-5 h-5" />
                Paystack
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {formatKes(balance?.paystack ?? 0)}
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200">
            <h3 className="font-extrabold text-gray-900">Reconciliation (M-Pesa wallet)</h3>
            <p className="mt-1 text-sm text-gray-600">
              Accounting view for{" "}
              {balance?.scope === "visible_campaigns" ? "all visible campaigns" : "owned campaigns"}: inflow minus paid-out
              and in-transit withdrawal requests.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Inflow (successful)</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">KES {formatKes(balance?.mpesa ?? 0)}</div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">Paid out (completed)</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">KES {formatKes(balance?.mpesaPaidOut ?? 0)}</div>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">In transit (approved/processing)</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">KES {formatKes(balance?.mpesaInTransit ?? 0)}</div>
              </div>
              <div className="rounded border border-green-200 bg-green-50 p-3">
                <div className="text-xs font-bold text-green-800 uppercase tracking-wide">Net available</div>
                <div className="mt-1 text-lg font-extrabold text-green-900">KES {formatKes(balance?.mpesaAvailable ?? 0)}</div>
              </div>
            </div>
            {(balance?.mpesaPendingApproval ?? 0) > 0 ? (
              <p className="mt-3 text-sm text-amber-700">
                Pending admin approval (not deducted yet): KES {formatKes(balance?.mpesaPendingApproval ?? 0)}
              </p>
            ) : null}
          </div>

          {/* Request withdrawal */}
          <div className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200">
            <h3 className="font-extrabold text-gray-900">Request M-Pesa Withdrawal</h3>
            <form onSubmit={handleWithdraw} className="mt-4 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (KES)</label>
                <input
                  type="number"
                  min={10}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 500"
                  className="mt-1 block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">M-Pesa number</label>
                <input
                  type="tel"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="254712345678"
                  className="mt-1 block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || (balance?.mpesaAvailable ?? 0) < 10}
                className="px-4 py-2 rounded-md bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Request withdrawal
              </button>
            </form>
            {submitError && (
              <p className="mt-2 text-sm text-red-600">{submitError}</p>
            )}
          </div>

          {/* Admin: Pending approvals */}
          {isFullAdmin && pendingAdmin.length > 0 && (
            <div className="mt-6 bg-amber-50 rounded-md shadow-sm p-6 border border-amber-200">
              <h3 className="font-extrabold text-amber-900">Pending approvals</h3>
              <p className="mt-1 text-sm text-amber-800">Review and approve or reject withdrawal requests.</p>
              <div className="mt-4 space-y-3">
                {pendingAdmin.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded border border-amber-200"
                  >
                    <div>
                      <span className="font-bold">KES {formatKes(Number(w.amount))}</span>
                      <span className="text-gray-600 ml-2">→ {w.recipient_phone}</span>
                      {w.created_by && (
                        <span className="block text-xs text-gray-500 mt-1">Requested by: {w.created_by.slice(0, 8)}…</span>
                      )}
                      {(w.metadata as { b2c_error?: string })?.b2c_error && (
                        <span className="block text-xs text-red-600 mt-1">
                          Previous B2C attempt failed: {(w.metadata as { b2c_error: string }).b2c_error}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(w.id)}
                        disabled={!!approvingId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        {approvingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(w.id)}
                        disabled={!!rejectingId}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        {rejectingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin: Stuck withdrawals (revert when B2C fails or callback never arrives) */}
          {isFullAdmin && stuckWithdrawals.length > 0 && (
            <div className="mt-6 bg-orange-50 rounded-md shadow-sm p-6 border border-orange-200">
              <h3 className="font-extrabold text-orange-900">Stuck withdrawals</h3>
              <p className="mt-1 text-sm text-orange-800">
                These were approved but cash may not have been sent. Click Revert to restore balance.
              </p>
              <div className="mt-4 space-y-3">
                {stuckWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded border border-orange-200"
                  >
                    <div>
                      <span className="font-bold">KES {formatKes(Number(w.amount))}</span>
                      <span className="text-gray-600 ml-2">→ {w.recipient_phone}</span>
                      {(w.metadata as { b2c_error?: string })?.b2c_error && (
                        <span className="block text-xs text-red-600 mt-1">
                          B2C error: {(w.metadata as { b2c_error: string }).b2c_error}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReject(w.id)}
                      disabled={!!rejectingId}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
                    >
                      {rejectingId === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Revert
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Withdrawal history */}
          <div className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200">
            <h3 className="font-extrabold text-gray-900">Withdrawal history</h3>
            {myWithdrawals.length === 0 ? (
              <p className="mt-2 text-sm text-gray-600">No withdrawal requests yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Amount</th>
                      <th className="pb-2 pr-4">Recipient</th>
                      {isFullAdmin && <th className="pb-2 pr-4">Requester</th>}
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myWithdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-700">
                          {new Date(w.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 font-semibold">
                          {String(w.currency ?? "KES").toUpperCase()} {formatKes(Number(w.amount))}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{w.recipient_phone}</td>
                        {isFullAdmin && (
                          <td className="py-3 pr-4 text-gray-500 text-xs">
                            {w.created_by ? `${w.created_by.slice(0, 8)}…` : "—"}
                          </td>
                        )}
                        <td className="py-3">{statusBadge(w.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
