"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Shield, UserPlus } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { UserCog } from "lucide-react";
import { supabase } from "@/lib/supabase";

function isMissingAdminUsersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  return code === "42P01" || (msg.includes("admin_users") && msg.includes("does not exist"));
}

export default function DashboardUsersPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, isAdmin, isFullAdmin } = usePortal();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminOk, setAdminOk] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [makeManager, setMakeManager] = useState(false);
  const [tier, setTier] = useState<"basic" | "pro" | "enterprise">("basic");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password || password.length < 6) return false;
    if (password !== confirm) return false;
    return true;
  }, [confirm, email, password]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
      return;
    }

    let cancelled = false;
    const checkAdmin = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!isAdmin) {
          const { data: adminRow, error: adminErr } = await supabase
            .from("admin_users")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (adminErr && isMissingAdminUsersTable(adminErr)) {
            await supabase.auth.signOut();
            router.replace("/fusion-xpress?error=setup");
            return;
          }
          if (adminErr) throw adminErr;
          if (!adminRow) {
            await supabase.auth.signOut();
            router.replace("/fusion-xpress?error=unauthorized");
            return;
          }
        }
        if (!cancelled) setAdminOk(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unable to verify admin access");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, isAdmin, router, user]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminOk) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Missing session. Please sign in again.");

      const res = await fetch("/api/fusion-xpress/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: token,
          email: email.trim(),
          password,
          make_admin: makeAdmin,
          make_manager: makeManager,
          email_confirm: true,
          tier: makeAdmin || makeManager ? undefined : tier,
        }),
      });

      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = {};
      }
      if (!res.ok) throw new Error(json?.error ?? raw ?? `Failed (HTTP ${res.status})`);

      setSuccess(
        `Created user ${json.email ?? email.trim()}${
          makeAdmin ? " (admin)" : makeManager ? " (manager)" : ` (${tier} tier)`
        }.`
      );
      setEmail("");
      setPassword("");
      setConfirm("");
      setMakeAdmin(false);
      setMakeManager(false);
      setTier("basic");
    } catch (err: any) {
      setError(err?.message ?? "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !isPortalMember) return null;

  return (
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Users</h2>
          <p className="mt-1 text-gray-600 text-left max-w-3xl">
            Create accounts for clients who purchase your service. Set their tier (Basic, Pro, Enterprise) based on purchase amount to control which dashboard features they can access.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800 whitespace-pre-wrap">
          {success}
        </div>
      )}

      <form onSubmit={onCreate} className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200">
        <div className="flex items-center gap-2 text-primary-700 font-extrabold">
          <UserPlus className="w-5 h-5" />
          Create user
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="user@example.com"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-6 md:mt-0">
            {isFullAdmin && (
              <>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={makeAdmin}
                    onChange={(e) => {
                      setMakeAdmin(e.target.checked);
                      if (e.target.checked) setMakeManager(false);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <Shield className="w-4 h-4" />
                  Make this user a full admin
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 font-semibold select-none">
                  <input
                    type="checkbox"
                    checked={makeManager}
                    onChange={(e) => {
                      setMakeManager(e.target.checked);
                      if (e.target.checked) setMakeAdmin(false);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <UserCog className="w-4 h-4" />
                  Make this user a manager (limited admin)
                </label>
              </>
            )}
            {!makeAdmin && !makeManager && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Tier (by purchase amount):</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as "basic" | "pro" | "enterprise")}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Re-enter password"
              />
            </div>
            {confirm && password !== confirm && (
              <div className="mt-2 text-xs font-semibold text-red-600">Passwords do not match.</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            {saving ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}

