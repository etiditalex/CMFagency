"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Shield } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  hasVisitorManagementAccess,
  isVisitorOnlyPortalUser,
  parsePortalFeatures,
} from "@/lib/visitors/visitor-only-access";

const ADMIN_LOGIN = "/fusion-xpress/admin-login";
const VISITOR_SIGN_IN = "/fusion-xpress/smart-visitor-management/sign-in";
const EMPLOYER_SIGN_IN = "/jobs?tab=employers";
const TEAMS_WORK_SIGN_IN = "/teams-work/portal";

function readUrlAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const fromSearch = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const fromHash = new URLSearchParams(hash);
  const description =
    fromSearch.get("error_description") ||
    fromHash.get("error_description") ||
    fromSearch.get("error") ||
    fromHash.get("error");
  if (!description) return null;
  return description.replace(/\+/g, " ");
}

async function resolvePostResetLoginPath(): Promise<string> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user?.id) return ADMIN_LOGIN;

    const accountType = String(user.user_metadata?.account_type ?? "").toLowerCase();
    if (accountType === "employer") return EMPLOYER_SIGN_IN;
    if (accountType === "visitor_management") return VISITOR_SIGN_IN;

    const { data: member } = await supabase
      .from("portal_members")
      .select("role, features")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) return ADMIN_LOGIN;

    const role = String(member.role ?? "").toLowerCase();
    const features = parsePortalFeatures(member.features);
    const isAdmin = role === "admin";

    if (role === "admin" || role === "manager") return ADMIN_LOGIN;
    if (role === "employer") return EMPLOYER_SIGN_IN;
    if (isVisitorOnlyPortalUser(role, features, isAdmin) || hasVisitorManagementAccess(role, features, false)) {
      return VISITOR_SIGN_IN;
    }
    if (features.includes("teams_work") && role === "client") return TEAMS_WORK_SIGN_IN;
  } catch {
    // fall through
  }
  return ADMIN_LOGIN;
}

export default function FusionXpressResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loginHref, setLoginHref] = useState(ADMIN_LOGIN);

  const canSubmit = useMemo(() => {
    return password.length >= 6 && password === confirm;
  }, [confirm, password]);

  useEffect(() => {
    let cancelled = false;
    let hasSession = false;

    const markReady = (ok: boolean, message?: string | null) => {
      if (cancelled) return;
      if (ok) {
        hasSession = true;
        setError(null);
        setReady(true);
        return;
      }
      // Never lock out a late PASSWORD_RECOVERY / session after a timeout miss.
      if (hasSession) return;
      setReady(true);
      setError(
        message ||
          "Invalid or expired reset link. Please request a new one from your portal sign-in page."
      );
    };

    const urlError = readUrlAuthError();
    if (urlError) {
      markReady(false, urlError);
      return () => {
        cancelled = true;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        markReady(true);
      }
    });

    const establishSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const otpType = params.get("type");
      if (tokenHash && (otpType === "recovery" || !otpType)) {
        const { data, error: otpErr } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (!cancelled && data.session) {
          window.history.replaceState({}, document.title, window.location.pathname);
          markReady(true);
          return;
        }
        if (otpErr && !cancelled) {
          markReady(false, otpErr.message || "Invalid or expired reset link.");
          return;
        }
      }

      const code = params.get("code");
      if (code) {
        const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && data.session) {
          window.history.replaceState({}, document.title, window.location.pathname);
          markReady(true);
          return;
        }
        if (exchangeErr && !cancelled) {
          console.warn("Password recovery code exchange:", exchangeErr.message);
        }
      }

      for (let i = 0; i < 15; i++) {
        if (cancelled || hasSession) return;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          markReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      markReady(false);
    };

    void establishSession();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError(
          "Your session has expired or the link was already used. Please request a new password reset link from your portal sign-in page."
        );
        setLoading(false);
        return;
      }

      const nextLogin = await resolvePostResetLoginPath();
      setLoginHref(nextLogin);

      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;

      // Password is updated; clear the recovery session so the next sign-in runs normal 2FA.
      await supabase.auth.signOut();
      router.replace(`${nextLogin}${nextLogin.includes("?") ? "&" : "?"}passwordReset=1`);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Unable to update password.";
      if (msg.includes("Auth session missing") || msg.includes("AuthSessionMissingError")) {
        setError(
          "Your session expired. Please request a new password reset link from your portal sign-in page and use it within a few minutes."
        );
      } else {
        setError(msg);
      }
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
        <Link href={loginHref} className="inline-flex items-center text-gray-600 hover:text-primary-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 text-center">
            <div className="flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 text-white flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7" />
              </div>
            </div>
            <h1 className="mt-5 text-3xl font-extrabold text-gray-900">Set a new password</h1>
            <p className="mt-2 text-gray-600">Choose a strong password for your business portal account.</p>
          </div>

          <div className="p-8">
            {error && (
              <>
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
                {(error.toLowerCase().includes("invalid") ||
                  error.toLowerCase().includes("expired") ||
                  error.toLowerCase().includes("session") ||
                  error.toLowerCase().includes("otp")) && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                    <strong>How to reset your password:</strong> Open your portal sign-in page (
                    <Link href={VISITOR_SIGN_IN} className="underline font-semibold">
                      Visitor Management
                    </Link>
                    ,{" "}
                    <Link href={EMPLOYER_SIGN_IN} className="underline font-semibold">
                      Employers
                    </Link>
                    , or{" "}
                    <Link href={ADMIN_LOGIN} className="underline font-semibold">
                      Admin login
                    </Link>
                    ), enter your email, click &quot;Forgot password&quot;, then open the fresh link from the
                    email. Do not open this page directly.
                  </div>
                )}
              </>
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
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
