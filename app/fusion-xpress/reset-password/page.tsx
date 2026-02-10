"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Shield } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function FusionXpressResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const canSubmit = useMemo(() => {
    return password.length >= 6 && password === confirm;
  }, [confirm, password]);

  useEffect(() => {
    // The reset link sets a session in the URL hash; supabase client will pick it up
    // because detectSessionInUrl is enabled in `lib/supabase.ts`.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Invalid or expired reset link. Please request a new one from Fusion Xpress login.");
      }
      setReady(true);
    };
    check();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      router.replace("/fusion-xpress");
    } catch (err: any) {
      setError(err?.message ?? "Unable to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen pt-28 md:pt-32 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing password reset…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 md:pt-32 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/fusion-xpress" className="inline-flex items-center text-gray-600 hover:text-primary-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Fusion Xpress login
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 text-center">
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7" />
              </div>
            </div>
            <h1 className="mt-5 text-3xl font-extrabold text-gray-900">Set a new password</h1>
            <p className="mt-2 text-gray-600">Choose a strong password to access Fusion Xpress.</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Re-enter password"
                    required
                  />
                </div>
                {confirm && password !== confirm && (
                  <div className="mt-2 text-xs text-red-600 font-semibold">Passwords do not match.</div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full bg-primary-700 text-white py-3 rounded-lg font-semibold hover:bg-primary-800 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

