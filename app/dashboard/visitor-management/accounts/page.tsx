"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, RefreshCw, Trash2, UserCheck } from "lucide-react";

import VisitorAccountExtensionControls, {
  type VisitorAccountExtensionInfo,
  type VisitorAccountSubscriptionInfo,
} from "@/components/fusion-xpress/visitor-management/accounts/VisitorAccountExtensionControls";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { industryLabel, VISITOR_MANAGEMENT_PATH, VISITOR_MANAGEMENT_EMPLOYEES_PATH, VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH } from "@/lib/visitors/industry-options";
import { supabase } from "@/lib/supabase";

type VisitorAccount = {
  user_id: string;
  email: string;
  business_name: string;
  contact_name: string;
  organization_industry: string | null;
  email_confirmed: boolean;
  created_at: string | null;
  subscription: VisitorAccountSubscriptionInfo;
  extension: VisitorAccountExtensionInfo;
};

export default function VisitorManagementAccountsPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<VisitorAccount[]>([]);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

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
      if (expandedUserId === account.user_id) setExpandedUserId(null);
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
          <p className="mt-2 text-gray-600 text-sm">Client accounts and subscription extensions.</p>
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
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Extension</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Access</th>
                  {isFullAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((account) => (
                  <Fragment key={account.user_id}>
                    <tr className="hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{account.business_name}</div>
                        <div className="text-xs text-gray-500">{account.contact_name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{account.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          {account.subscription.planLabel}
                        </span>
                        {account.subscription.isActive ? (
                          <span className="ml-1 text-emerald-700 text-xs">· Active</span>
                        ) : (
                          <span className="ml-1 text-amber-800 text-xs">· Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {account.extension.active ? (
                          <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-900">
                            Until {account.extension.endsLabel}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {industryLabel(account.organization_industry)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs font-semibold">
                          <Link
                            href={`${VISITOR_MANAGEMENT_PATH}?owner=${encodeURIComponent(account.user_id)}`}
                            className="text-primary-700 hover:underline"
                          >
                            Visitors
                          </Link>
                          <Link
                            href={`${VISITOR_MANAGEMENT_EMPLOYEES_PATH}?owner=${encodeURIComponent(account.user_id)}`}
                            className="text-primary-700 hover:underline"
                          >
                            Sign in / out
                          </Link>
                          <Link
                            href={`${VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH}?owner=${encodeURIComponent(account.user_id)}`}
                            className="text-primary-700 hover:underline"
                          >
                            Summary reports
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedUserId((id) =>
                              id === account.user_id ? null : account.user_id
                            )
                          }
                          className="text-xs font-bold text-primary-700 hover:underline"
                        >
                          {expandedUserId === account.user_id ? "Hide" : "Manage access"}
                        </button>
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
                    {expandedUserId === account.user_id ? (
                      <tr>
                        <td
                          colSpan={isFullAdmin ? 8 : 7}
                          className="px-4 py-3 bg-gray-50/80 border-b border-gray-100"
                        >
                          <VisitorAccountExtensionControls
                            userId={account.user_id}
                            email={account.email}
                            subscription={account.subscription}
                            extension={account.extension}
                            onUpdated={() => void loadAccounts()}
                            onError={setError}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
