"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Shield, ArrowLeft } from "lucide-react";

import { supabase } from "@/lib/supabase";

/**
 * Fusion Xpress (Admin Login)
 * -----------------------------------------------------------------------------
 * This is intentionally separate from the job-application login UI/flow.
 *
 * Security:
 * - Uses Supabase Auth, but requires the signed-in user to exist in `admin_users`.
 * - If not allowlisted, we sign the user out and show an error.
 *
 * DB requirement:
 * - Run `database/ticketing_voting_mvp_patch_02_admin.sql` in Supabase.
 * - Insert admin row into `admin_users`.
 */
export default function FusionXpressAdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialError = sp?.get("error") ?? null;

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "unauthorized" ? "Please sign in with an admin account." : null
  );

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password) return false;
    if (mode === "signup") {
      return password === confirmPassword && password.length >= 6;
    }
    return true;
  }, [confirmPassword, email, mode, password]);

  useEffect(() => {
    // If already signed in and admin, go straight to dashboard.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (adminRow) router.replace("/dashboard/campaigns");
    };

    check();
  }, [router]);

  const requireAdminOrSignOut = async (userId: string) => {
    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminErr) throw adminErr;
    if (!adminRow) {
      await supabase.auth.signOut();
      throw new Error(
        "Account created/signed in, but not yet authorized for Fusion Xpress. Ask an admin to allowlist your user in admin_users."
      );
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (signUpErr) throw signUpErr;

        const userId = data.user?.id;
        if (!userId) throw new Error("Sign up created no user. Please try again.");

        // If email confirmations are enabled, Supabase may not create an active session yet.
        // In that case, the admin can confirm email or the user can complete verification.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          throw new Error(
            "Account created. Please confirm your email, then come back to login. After that, an admin must allowlist your account for Fusion Xpress."
          );
        }

        await requireAdminOrSignOut(userId);
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) throw signInErr;

        const userId = data.user?.id;
        if (!userId) throw new Error("Login failed. Please try again.");

        await requireAdminOrSignOut(userId);
      }

      router.replace("/dashboard/campaigns");
    } catch (e: any) {
      setError(e?.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4 pt-32 md:pt-40">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-8 text-white text-center">
            <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Fusion Xpress</h1>
            <p className="text-white/90">Admin access for Campaigns & Ticketing</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? mode === "login"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "login"
                    ? "Login to Fusion Xpress"
                    : "Create Fusion Xpress admin account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              {mode === "login" ? (
                <>
                  Don’t have an admin account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError(null);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 text-xs text-gray-500">
              Note: This login is for admins who generate campaign links and manage the ticketing/voting module.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

