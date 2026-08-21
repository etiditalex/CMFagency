"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Shield, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

export default function DashboardAccountPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading } = usePortal();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [totpRequired, setTotpRequired] = useState(false);
  const [totpSetupUrl, setTotpSetupUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpConfirmCode, setTotpConfirmCode] = useState("");
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [totpConfirmLoading, setTotpConfirmLoading] = useState(false);
  const [totpDisableLoading, setTotpDisableLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      newPassword.length >= 6 &&
      newPassword === confirmPassword
    );
  }, [newPassword, confirmPassword]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress");
    }
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, router, user]);

  const fetchTotpStatus = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/fusion-xpress/2fa/method", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json().catch(() => ({}));
    setTotpEnabled(!!(json as { hasTotp?: boolean }).hasTotp);
    setTotpRequired(!!(json as { totpRequired?: boolean }).totpRequired);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !isPortalMember) return;
    fetchTotpStatus();
  }, [isAuthenticated, isPortalMember, fetchTotpStatus]);

  const onTotpSetup = async () => {
    setError(null);
    setTotpSetupLoading(true);
    setTotpSetupUrl(null);
    setTotpSecret(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/fusion-xpress/2fa/totp/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Setup failed");
      setTotpSetupUrl((json as { otpauthUrl: string }).otpauthUrl);
      setTotpSecret((json as { secret?: string }).secret ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start setup");
    } finally {
      setTotpSetupLoading(false);
    }
  };

  const onTotpConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = totpConfirmCode.trim().replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your app");
      return;
    }
    setTotpConfirmLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/fusion-xpress/2fa/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Verification failed");
      setTotpEnabled(true);
      setTotpSetupUrl(null);
      setTotpSecret(null);
      setTotpConfirmCode("");
      setSuccess("Google Authenticator enabled. You can use it at next login.");
    } catch (e: any) {
      setError(e?.message ?? "Invalid code");
    } finally {
      setTotpConfirmLoading(false);
    }
  };

  const onTotpDisable = async () => {
    if (!confirm("Disable Google Authenticator? You will use email codes only at login.")) return;
    setError(null);
    setTotpDisableLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/fusion-xpress/2fa/totp/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to disable");
      setTotpEnabled(false);
      setSuccess("Google Authenticator disabled.");
    } catch (e: any) {
      setError(e?.message ?? "Failed to disable");
    } finally {
      setTotpDisableLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      setSuccess("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err?.message ?? "Unable to update password.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || portalLoading) {
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
    <div className="text-left">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold text-[#1a2332] text-left pb-3 border-b border-[#e5e5e5]">Account</h2>
          <p className="mt-1 text-gray-600 text-left max-w-3xl">
            Manage your account settings. Change your password while staying logged in.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          {success}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 bg-white p-6 border border-[#e5e5e5] max-w-xl">
        <div className="flex items-center gap-2 text-primary-700 font-extrabold">
          <Lock className="w-5 h-5" />
          Change password
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Choose a strong password (at least 6 characters). You will stay signed in.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="At least 6 characters"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm new password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Re-enter new password"
                required
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
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
            <Lock className="w-4 h-4" />
            {saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>

      <div className="mt-10 bg-white p-6 border border-[#e5e5e5] max-w-xl">
        <div className="flex items-center gap-2 text-primary-700 font-extrabold">
          <Shield className="w-5 h-5" />
          Two-factor authentication
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {totpRequired
            ? "Business accounts must set up Google Authenticator. Email codes are sent by default at sign-in; you can also use your authenticator app."
            : "Use an email code or Google Authenticator (or any TOTP app) when signing in to the portal."}
        </p>

        {totpEnabled === null ? (
          <p className="mt-4 text-sm text-gray-500">Loading…</p>
        ) : totpSetupUrl ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm font-medium text-gray-700">Scan with your authenticator app, then enter the code below.</p>
            <div className="flex flex-wrap items-start gap-6">
              <div className="bg-white p-3 rounded-lg border border-gray-200 inline-block">
                <QRCodeSVG value={totpSetupUrl} size={180} level="M" />
              </div>
              {totpSecret && (
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700">Or enter manually:</p>
                  <code className="mt-1 block break-all font-mono text-xs bg-gray-100 p-2 rounded">{totpSecret}</code>
                </div>
              )}
            </div>
            <form onSubmit={onTotpConfirm} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpConfirmCode}
                  onChange={(e) => setTotpConfirmCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg font-mono tracking-widest"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={totpConfirmLoading || totpConfirmCode.replace(/\D/g, "").length !== 6}
                className="px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
              >
                {totpConfirmLoading ? "Verifying…" : "Verify and enable"}
              </button>
              <button
                type="button"
                onClick={() => { setTotpSetupUrl(null); setTotpSecret(null); setTotpConfirmCode(""); setError(null); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </form>
          </div>
        ) : totpEnabled ? (
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 text-green-700 font-medium">
              <Smartphone className="w-5 h-5" />
              Google Authenticator is enabled
            </span>
            {!totpRequired ? (
              <button
                type="button"
                onClick={onTotpDisable}
                disabled={totpDisableLoading}
                className="px-4 py-2 border border-red-200 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-60"
              >
                {totpDisableLoading ? "Disabling…" : "Disable"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-5">
            <button
              type="button"
              onClick={onTotpSetup}
              disabled={totpSetupLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-700 text-white font-semibold hover:bg-primary-800 disabled:opacity-60"
            >
              <Smartphone className="w-4 h-4" />
              {totpSetupLoading ? "Starting…" : "Enable Google Authenticator"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
