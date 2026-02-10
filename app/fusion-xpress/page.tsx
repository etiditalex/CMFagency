"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock, Mail, Shield } from "lucide-react";

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

  const [resetSent, setResetSent] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password) return false;
    if (mode === "signup") {
      return password === confirmPassword && password.length >= 6;
    }
    return true;
  }, [confirmPassword, email, mode, password]);

  const maybeClaimAdmin = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch("/api/fusion-xpress/claim-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token }),
      });
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    // If already signed in and admin, go straight to dashboard.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;

      // If this email is configured in the server allowlist, auto-claim admin access.
      await maybeClaimAdmin();

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
    setResetSent(false);

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

        await maybeClaimAdmin();
        await requireAdminOrSignOut(userId);
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInErr) throw signInErr;

        const userId = data.user?.id;
        if (!userId) throw new Error("Login failed. Please try again.");

        await maybeClaimAdmin();
        await requireAdminOrSignOut(userId);
      }

      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const onForgotPassword = async () => {
    setError(null);
    setResetSent(false);
    const e = email.trim();
    if (!e) {
      setError("Enter your email first, then click “Forgot password”.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${window.location.origin}/fusion-xpress/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 md:pt-32 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Marketing / services section (like screenshot), then login at the end */}
        <section className="text-left">
          {/* Hero (image background) */}
          <div className="relative overflow-hidden rounded-3xl border border-gray-200">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/10" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary-500/25 blur-3xl" />
              <div className="absolute bottom-8 -right-24 w-80 h-80 rounded-full bg-secondary-500/25 blur-3xl" />
            </div>

            <div className="relative p-6 md:p-10">
              <div className="max-w-4xl">
                <h1 className="mt-5 text-4xl md:text-5xl font-extrabold text-white leading-tight text-left">
                  Changer Fusions helps creators run unforgettable experiences.
                </h1>
                <p className="mt-4 text-white/90 leading-relaxed max-w-3xl">
                  We support event organizers, artists, talent brands, and entertainment businesses with campaign setup, ticketing,
                  voting programs, and marketing execution—built to be simple for audiences and reliable for admins.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-secondary-300 shadow-sm p-6">
              <div className="text-secondary-800 font-extrabold">Experiences</div>
              <div className="mt-3 text-4xl font-extrabold text-gray-900">Ticketing</div>
              <div className="mt-2 text-sm text-gray-600">For Events, Shows & Launches</div>
              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {[
                  "Create ticketing campaigns in minutes",
                  "Webhook-confirmed M-Pesa payments",
                  "Issue tickets only after verification",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-300 shadow-sm p-6">
              <div className="text-secondary-800 font-extrabold">Voting Programs</div>
              <div className="mt-3 text-4xl font-extrabold text-gray-900">Voting</div>
              <div className="mt-2 text-sm text-gray-600">For Paid Voting Programs</div>
              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {[
                  "Contestant setup + shareable links",
                  "Votes counted only after webhook success",
                  "Clear reporting for campaign performance",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-secondary-300 shadow-sm p-6">
              <div className="text-secondary-800 font-extrabold">Enterprise</div>
              <div className="mt-3 text-4xl font-extrabold text-gray-900">Custom</div>
              <div className="mt-2 text-sm text-gray-600">Ideal for Businesses & Companies</div>
              <div className="mt-5 space-y-3 text-sm text-gray-700">
                {[
                  "Custom workflows and reporting",
                  "Security-first admin access control",
                  "Support with go-live + monitoring",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-secondary-700 mt-0.5" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black transition-colors"
                >
                  Talk to sales
                </a>
              </div>
            </div>
          </div>

          {/* Pricing section (like screenshot) */}
          <div className="mt-10 rounded-3xl border border-secondary-200 bg-gradient-to-r from-secondary-50 via-white to-white overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-6 md:p-10 items-center">
              <div className="lg:col-span-3">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
                  The most
                  <br />
                  affordable prices
                  <br />
                  in Kenya
                </h2>
                <div className="mt-4 font-extrabold text-gray-900">
                  No contracts, no monthly fees, no worries
                </div>
                <p className="mt-3 text-gray-600 leading-relaxed max-w-xl">
                  Our fees are affordable and make sense. We only charge when you successfully sell tickets or collect paid
                  votes—so you can launch confidently and scale as your audience grows.
                </p>
              </div>

              <div className="lg:col-span-2">
                <div className="w-full max-w-sm lg:ml-auto rounded-2xl bg-secondary-900 text-white p-8 shadow-lg">
                  <div className="mx-auto w-28 h-28 rounded-full border-2 border-white/70 flex items-center justify-center">
                    <div className="text-5xl font-extrabold">5%</div>
                  </div>
                  <div className="mt-5 font-extrabold text-lg">Per ticket sold</div>
                  <div className="mt-1 text-sm text-white/80">
                    Includes payment processing fees and webhook verification.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="text-2xl md:text-3xl font-extrabold text-secondary-800 text-left">
              Payments to Organisers
            </div>
            <p className="mt-4 text-gray-600 leading-relaxed">
              In terms of event funds payout, we try to make it as much pleasing for the Organiser as for the ticket buyer in
              cases where the event might be canceled. Funds are available for withdrawal to organisers as soon as 2 days from
              whenever the event is published. The organiser is able to withdraw any amount he/she needs at any time for a maximum
              of once a day until the experience is over, any pending balance shall be settled by Changer Fusions and an experience
              report will be shared with the organiser. This however means that Changer Fusions shall not be liable for any
              refunds and incase of event cancellation the organiser shall be fully liable to reimburse customers/ticket buyers as
              per contract statements.
            </p>
          </div>
        </section>

        {/* Admin login (towards the end) */}
        <section className="mt-12 flex items-center justify-center">
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
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 text-center">
                  Members-only access. Only allowlisted admin members can sign in.
                </div>
              </div>

              <div className="p-8">
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

                  {mode === "login" && (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-sm font-semibold text-primary-700 hover:text-primary-800"
                        disabled={loading}
                      >
                        Forgot / Create password
                      </button>
                      {resetSent && <span className="text-xs text-green-700 font-semibold">Reset link sent</span>}
                    </div>
                  )}

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
    </div>
  );
}

