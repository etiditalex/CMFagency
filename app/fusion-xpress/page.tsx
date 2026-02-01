"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, Shield } from "lucide-react";

import { supabase } from "@/lib/supabase";

function isMissingAdminUsersTable(err: any) {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  // Postgres: 42P01 = undefined_table
  return code === "42P01" || (msg.includes("admin_users") && msg.includes("does not exist"));
}

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
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(
    initialError === "unauthorized"
      ? "Access denied. Sign in with an allowlisted admin account."
      : initialError === "setup"
        ? "Fusion Xpress is not configured yet. Run the database setup SQL and enable admin allowlisting."
        : null
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

      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      // If admin allowlist table isn't installed, block access until configured.
      if (adminErr && isMissingAdminUsersTable(adminErr)) {
        await supabase.auth.signOut();
        setError(
          "Fusion Xpress is not configured yet. Run `database/ticketing_voting_mvp.sql` and `database/ticketing_voting_mvp_patch_02_admin.sql`, then allowlist your user in `admin_users`."
        );
        return;
      }

      if (adminRow) {
        router.replace("/dashboard");
      }
    };

    check();
  }, [router]);

  const requireAdminOrSignOut = async (userId: string) => {
    const { data: adminRow, error: adminErr } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminErr && isMissingAdminUsersTable(adminErr)) {
      await supabase.auth.signOut();
      throw new Error(
        "Fusion Xpress is not configured yet. Run `database/ticketing_voting_mvp.sql` and `database/ticketing_voting_mvp_patch_02_admin.sql`, then allowlist your user in `admin_users`."
      );
    }
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

      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left brand panel */}
      <section className="relative hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/55 to-black/70" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary-500/25 blur-3xl" />
          <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full bg-secondary-500/25 blur-3xl" />
        </div>

        <div className="relative h-full flex items-center px-10 xl:px-16">
          <div className="max-w-xl text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 backdrop-blur-md">
              <Shield className="w-4 h-4" />
              Admin Portal
            </div>

            <h1 className="mt-6 text-4xl xl:text-5xl font-extrabold leading-tight text-white text-left">
              Fusion Xpress
            </h1>
            <p className="mt-4 text-white/90 text-lg leading-relaxed">
              A private dashboard for creating campaigns, generating payment links, and monitoring ticket/vote activity.
            </p>

            <div className="mt-8 space-y-3 text-white/90">
              <div className="rounded-xl bg-white/10 border border-white/15 p-4 backdrop-blur-md">
                <div className="font-semibold text-white">What you can do</div>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>Generate shareable links for tickets or voting campaigns</li>
                  <li>Track webhook-confirmed transactions and fulfillment</li>
                  <li>Keep campaigns active/inactive with clear visibility rules</li>
                </ul>
              </div>

              <div className="text-xs text-white/70">
                Access is restricted to allowlisted admins only. If you need access, contact the system administrator.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right login panel */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-6 py-16 lg:py-10">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-primary-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white flex items-center justify-center shadow-lg">
                  <Shield className="w-7 h-7" />
                </div>
              </div>
              <h2 className="mt-5 text-3xl font-extrabold text-gray-900 text-center">
                {mode === "login" ? "Admin Sign In" : "Request Admin Access"}
              </h2>
              <p className="mt-2 text-gray-600 text-center">
                Use your admin account to access the Fusion Xpress dashboard.
              </p>
            </div>

            <div className="p-8">
              <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                Setup required in Supabase:
                <div className="mt-2 font-mono text-xs text-gray-700">
                  database/ticketing_voting_mvp.sql
                  <br />
                  database/ticketing_voting_mvp_patch_02_admin.sql
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  After signup, allowlist the user in <span className="font-mono">admin_users</span>.
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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

                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Keep me signed in
                  </label>

                  <span className="text-xs text-gray-500">
                    {rememberMe ? "Session saved" : "Session not saved"}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-lg font-semibold hover:from-black hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading
                    ? mode === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "login"
                      ? "Sign in to dashboard"
                      : "Create account (admin only)"}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                {mode === "login" ? (
                  <>
                    Need an admin account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-primary-700 hover:text-primary-800 font-semibold"
                    >
                      Request access
                    </button>
                  </>
                ) : (
                  <>
                    Already have access?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-primary-700 hover:text-primary-800 font-semibold"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              <div className="mt-6 text-xs text-gray-500 text-center">
                This portal is restricted. Non-admin users cannot access campaigns or generate payment links.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

