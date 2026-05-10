"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  BarChart3,
  ClipboardCheck,
  Crown,
  KeyRound,
  MessagesSquare,
  Pencil,
  Plus,
  Shield,
  Smartphone,
  Ticket,
  UserCog,
  UserPlus,
  Vote,
  Wallet,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

const FEATURES: { key: string; label: string; icon: typeof Wallet }[] = [
  { key: "create_campaign", label: "Create campaigns", icon: Plus },
  { key: "ticketing", label: "Ticketing", icon: Ticket },
  { key: "voting", label: "Voting", icon: Vote },
  { key: "reports", label: "Summary reports", icon: BarChart3 },
  { key: "payouts", label: "Payouts", icon: Wallet },
  { key: "coupons", label: "Coupons", icon: BadgePercent },
  { key: "managers", label: "Managers", icon: UserCog },
  { key: "email", label: "Email", icon: MessagesSquare },
  { key: "kcm_membership", label: "KCM membership", icon: Crown },
  { key: "teams_work", label: "Teams Work", icon: ClipboardCheck },
];

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
  const [features, setFeatures] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURES.map((f) => [f.key, false]))
  );
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<
    Array<{ user_id: string; email: string; role: string; tier: string; features: string[]; created_at: string; has_totp?: boolean }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);
  const [editForm, setEditForm] = useState<{ role: string; tier: string; features: Record<string, boolean> } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [totpUser, setTotpUser] = useState<typeof users[0] | null>(null);
  const [totpSetupUrl, setTotpSetupUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpConfirmCode, setTotpConfirmCode] = useState("");
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpConfirmLoading, setTotpConfirmLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/fusion-xpress/users", { headers: { Authorization: `Bearer ${token}` } });
      const json = (await res.json()) as { users?: typeof users; error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Failed to load users");
      setUsers(json.users ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

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

  useEffect(() => {
    if (adminOk) loadUsers();
  }, [adminOk, loadUsers]);

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
          features:
            makeAdmin || makeManager ? undefined : Object.keys(features).filter((k) => features[k]),
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
      loadUsers();
      setEmail("");
      setPassword("");
      setConfirm("");
      setMakeAdmin(false);
      setMakeManager(false);
      setTier("basic");
      setFeatures(Object.fromEntries(FEATURES.map((f) => [f.key, false])));
    } catch (err: any) {
      setError(err?.message ?? "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u: typeof users[0]) => {
    setEditingUser(u);
    setEditForm({
      role: u.role,
      tier: u.tier,
      features: Object.fromEntries(FEATURES.map((f) => [f.key, u.features.includes(f.key)])),
    });
  };

  const saveEdit = async () => {
    if (!editingUser || !editForm) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/fusion-xpress/users/${editingUser.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: token,
          role: editForm.role as "admin" | "manager" | "client",
          tier: editForm.tier as "basic" | "pro" | "enterprise",
          features: Object.keys(editForm.features).filter((k) => editForm!.features[k]),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Failed to update");
      setSuccess("User updated successfully.");
      setEditingUser(null);
      setEditForm(null);
      loadUsers();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  };

  const openTotpSetup = (u: typeof users[0]) => {
    setTotpUser(u);
    setTotpSetupUrl(null);
    setTotpSecret(null);
    setTotpConfirmCode("");
    setSuccess(null);
    setError(null);
  };

  const startTotpSetup = async () => {
    if (!totpUser) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setTotpSetupLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fusion-xpress/users/${totpUser.user_id}/2fa-totp-setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { otpauthUrl?: string; secret?: string; error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Setup failed");
      setTotpSetupUrl(json.otpauthUrl ?? null);
      setTotpSecret(json.secret ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start setup");
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const confirmTotpForUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpUser) return;
    const code = totpConfirmCode.trim().replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setTotpConfirmLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fusion-xpress/users/${totpUser.user_id}/2fa-totp-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json?.error ?? "Invalid code");
      setSuccess(`Google Authenticator enabled for ${totpUser.email}. You can sign in as them using the code from your app.`);
      setTotpUser(null);
      setTotpSetupUrl(null);
      setTotpSecret(null);
      setTotpConfirmCode("");
      loadUsers();
    } catch (e: any) {
      setError(e?.message ?? "Verification failed");
    } finally {
      setTotpConfirmLoading(false);
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
            Create accounts for clients and manage existing users. View all added users and change their features, role, or tier.
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
                  onChange={(e) => {
                    const v = e.target.value as "basic" | "pro" | "enterprise";
                    setTier(v);
                    const allOn = v === "pro" || v === "enterprise";
                    setFeatures((prev) =>
                      Object.fromEntries(
                        FEATURES.map((f) => [f.key, f.key === "kcm_membership" || f.key === "teams_work" ? false : allOn])
                      )
                    );
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Premium</option>
                </select>
              </div>
            )}
          </div>

          {!makeAdmin && !makeManager && (
            <div className="md:col-span-2 mt-2">
              <div className="text-sm font-semibold text-gray-700 mb-3">Features (check what they can use)</div>
              <p className="text-xs text-gray-500 mb-3 max-w-2xl">
                Enable reports, ticketing, or voting only <strong>after an agreement is signed</strong> and activities begin. Clients see only their own campaigns and payments—never admin agency data.
              </p>
              <div className="flex flex-wrap gap-4">
                {FEATURES.map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 font-medium select-none cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={features[key] ?? false}
                      onChange={(e) =>
                        setFeatures((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <Icon className="w-4 h-4 text-gray-500" />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setFeatures((prev) => Object.fromEntries(FEATURES.map((f) => [f.key, true])))
                  }
                  className="text-xs text-primary-600 hover:underline font-medium"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFeatures((prev) => Object.fromEntries(FEATURES.map((f) => [f.key, false])))
                  }
                  className="text-xs text-gray-500 hover:underline font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

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

      {/* All users list */}
      <div className="mt-10">
        <h3 className="text-lg font-extrabold text-gray-900 mb-4">All users</h3>
        {loadingUsers ? (
          <div className="text-gray-600 py-8">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="text-gray-500 py-6 border border-dashed border-gray-300 rounded-lg text-center">
            No users yet. Create one above.
          </div>
        ) : (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-auto max-h-[400px]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-bold text-gray-600 text-left">Email</th>
                    <th className="px-4 py-3 font-bold text-gray-600 text-left">Role</th>
                    <th className="px-4 py-3 font-bold text-gray-600 text-left">Tier</th>
                    <th className="px-4 py-3 font-bold text-gray-600 text-left">Features</th>
                    <th className="px-4 py-3 font-bold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-900">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            u.role === "admin"
                              ? "bg-primary-100 text-primary-800"
                              : u.role === "manager"
                                ? "bg-secondary-100 text-secondary-800"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{u.tier}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={u.features.join(", ")}>
                        {u.role === "admin" || u.role === "manager"
                          ? "All"
                          : u.features.length > 0
                            ? u.features.join(", ")
                            : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {isFullAdmin && (
                            <button
                              type="button"
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-gray-200 hover:bg-gray-100 text-gray-700 font-medium"
                            >
                              <Pencil className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                          {(isFullAdmin || isAdmin) && (u.role === "client" || u.role === "manager") && (
                            u.has_totp ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                                <Smartphone className="w-4 h-4" />
                                2FA
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openTotpSetup(u)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded border border-primary-200 hover:bg-primary-50 text-primary-700 font-medium"
                                title="Set up Google Authenticator so you can sign in as this user without email code"
                              >
                                <Smartphone className="w-4 h-4" />
                                Set up 2FA
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Set up Google Authenticator for another user (admin/manager) */}
      {totpUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-gray-900">Set up Google Authenticator</h3>
              <button
                type="button"
                onClick={() => {
                  setTotpUser(null);
                  setTotpSetupUrl(null);
                  setTotpSecret(null);
                  setTotpConfirmCode("");
                }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">For <strong>{totpUser.email}</strong>. Scan with your authenticator app so you can sign in as them without needing the email code.</p>
            {!totpSetupUrl ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={startTotpSetup}
                  disabled={totpSetupLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
                >
                  <Smartphone className="w-5 h-5" />
                  {totpSetupLoading ? "Generating…" : "Generate QR code"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">Scan with Google Authenticator (or any TOTP app), then enter the 6-digit code below.</p>
                <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                  <QRCodeSVG value={totpSetupUrl} size={180} level="M" />
                </div>
                {totpSecret && (
                  <p className="text-xs text-gray-500">
                    Manual entry: <code className="break-all bg-gray-100 px-1 rounded">{totpSecret}</code>
                  </p>
                )}
                <form onSubmit={confirmTotpForUser} className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={totpConfirmCode}
                    onChange={(e) => setTotpConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTotpSetupUrl(null);
                        setTotpSecret(null);
                      }}
                      className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={totpConfirmLoading || totpConfirmCode.replace(/\D/g, "").length !== 6}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
                    >
                      {totpConfirmLoading ? "Verifying…" : "Verify and enable"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editingUser && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-extrabold text-gray-900">Edit user</h3>
              <button
                type="button"
                onClick={() => { setEditingUser(null); setEditForm(null); }}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">{editingUser.email}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => {
                    const v = e.target.value as "admin" | "manager" | "client";
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            role: v,
                            tier: v === "admin" || v === "manager" ? "enterprise" : prev.tier,
                            features:
                              v === "admin" || v === "manager"
                                ? Object.fromEntries(FEATURES.map((f) => [f.key, true]))
                                : prev.features,
                          }
                        : prev
                    );
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="client">Client</option>
                </select>
              </div>
              {(editForm.role === "client") && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tier</label>
                    <select
                      value={editForm.tier}
                      onChange={(e) => setEditForm((prev) => prev ? { ...prev, tier: e.target.value } : prev)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Features</label>
                    <div className="flex flex-wrap gap-3">
                      {FEATURES.map(({ key, label, icon: Icon }) => (
                        <label
                          key={key}
                          className="inline-flex items-center gap-2 text-sm text-gray-700 font-medium select-none cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={editForm.features[key] ?? false}
                            onChange={(e) =>
                              setEditForm((prev) =>
                                prev ? { ...prev, features: { ...prev.features, [key]: e.target.checked } } : prev
                              )
                            }
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <Icon className="w-4 h-4 text-gray-500" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setEditingUser(null); setEditForm(null); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
              >
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

