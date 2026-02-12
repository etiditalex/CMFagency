"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";

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
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Account</h2>
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

      <form onSubmit={onSubmit} className="mt-6 bg-white rounded-md shadow-sm p-6 border border-gray-200 max-w-xl">
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
    </div>
  );
}
