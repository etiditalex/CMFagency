"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, RefreshCw, Trash2, UserCheck } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { industryLabel, VISITOR_MANAGEMENT_PATH } from "@/lib/visitors/industry-options";
import { supabase } from "@/lib/supabase";

type VisitorAccount = {
  user_id: string;
  email: string;
  business_name: string;
  contact_name: string;
  organization_industry: string | null;
  email_confirmed: boolean;
  created_at: string | null;
};

export default function VisitorManagementAccountsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<VisitorAccount[]>([]);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const res = await fetch("/api/visitor-management/accounts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json()) as { accounts?: VisitorAccount[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load accounts");
      setAccounts(json.accounts ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }
    if (!isAdmin) {
      router.replace(VISITOR_MANAGEMENT_PATH);
      return;
    }
    loadAccounts();
  }, [
    authLoading,
    isAuthenticated,
    isAdmin,
    isPortalMember,
    loadAccounts,
    portalLoading,
    router,
    user,
  ]);

  const deleteAccount = async (account: VisitorAccount) => {
    const label = account.email || account.business_name;
    if (
      !window.confirm(
        `Delete visitor management account for ${label}? This removes their portal access, visitors, and login permanently.`
      )
    ) {
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    setDeletingUserId(account.user_id);
    setError(null);
    try {
      const res = await fetch(`/api/fusion-xpress/users/${account.user_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to delete account");
      setAccounts((prev) => prev.filter((a) => a.user_id !== account.user_id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={VISITOR_MANAGEMENT_PATH}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Visitor Management
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-primary-700 font-semibold text-sm mb-2">
            <UserCheck className="w-4 h-4" />
            Smart Visitor Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Accounts Manager</h1>
          <p className="mt-2 text-gray-600 text-sm sm:text-base max-w-2xl">
            Organizations that signed up for visitor management. This view is for Fusion Xpress admins only
            and is not shown to client accounts after login.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadAccounts()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 text-sm">Loading accounts…</div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            No visitor management client accounts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Joined</th>
                  {isFullAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((account) => (
                  <tr key={account.user_id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-semibold text-gray-900">{account.business_name}</td>
                    <td className="px-4 py-3 text-gray-700">{account.contact_name}</td>
                    <td className="px-4 py-3 text-gray-700">{account.email}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {industryLabel(account.organization_industry)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                          account.email_confirmed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {account.email_confirmed ? "Yes" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {account.created_at
                        ? new Date(account.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    {isFullAdmin && (
                      <td className="px-4 py-3 text-right">
                        {account.user_id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => deleteAccount(account)}
                            disabled={deletingUserId === account.user_id}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-red-200 hover:bg-red-50 text-red-700 font-medium disabled:opacity-50"
                            title="Delete account"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingUserId === account.user_id ? "Deleting…" : "Delete"}
                          </button>
                        )}
                      </td>
                    )}
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
