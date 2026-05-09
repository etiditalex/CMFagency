"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Mail } from "lucide-react";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { supabase } from "@/lib/supabase";

function isMissingPortalMembersTable(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
}

function isMissingAdminUsersTable(err: unknown) {
  const msg = String((err as { message?: string })?.message ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return code === "42P01" || (msg.includes("admin_users") && msg.includes("does not exist"));
}

export type PortalLoginFormProps = {
  /** Message shown above the form (e.g. from ?error= on Fusion Xpress). */
  initialErrorMessage?: string | null;
  /** Hiring-account hint for job-board embed. */
  showEmployerBanner?: boolean;
  /** Tighter card styling when used inside the job board. */
  layout?: "standalone" | "embedded";
  /** Where to send the user after successful 2FA verification. */
  redirectTo?: string;
  /** Logo above the card title (defaults to Changer Fusions brand logo). */
  logoSrc?: string;
  logoAlt?: string;
  className?: string;
};

/**
 * Supabase password sign-in + portal membership check + Fusion 2FA (email or TOTP).
 * Used on Fusion Xpress and embedded on /jobs for employers.
 */
export function PortalLoginForm({
  initialErrorMessage = null,
  showEmployerBanner = false,
  layout = "standalone",
  redirectTo = "/dashboard",
  logoSrc = BRAND_LOGO_URL,
  logoAlt = "Changer Fusions",
  className = "",
}: PortalLoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(initialErrorMessage);

  const [resetSent, setResetSent] = useState(false);

  type Step = "login" | "code";
  const [step, setStep] = useState<Step>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCodeLoading, setResendCodeLoading] = useState(false);
  const [hasTotp, setHasTotp] = useState(false);
  type TwoFactorMethod = "email" | "totp";
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>("email");

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!password) return false;
    return true;
  }, [email, password]);

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
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      const userEmail = data.session?.user?.email ?? "";
      if (!userId) return;

      await maybeClaimAdmin();

      const { data: memberRow, error: memberErr } = await supabase
        .from("portal_members")
        .select("user_id,role")
        .eq("user_id", userId)
        .maybeSingle();

      if (memberErr && isMissingPortalMembersTable(memberErr)) {
        const { data: adminRow, error: adminErr } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (adminErr && isMissingAdminUsersTable(adminErr)) {
          await supabase.auth.signOut();
          setError(
            "Fusion Xpress portal is not configured yet. Run `database/ticketing_voting_mvp.sql` and `database/ticketing_voting_mvp_patch_04_portal_members_rbac.sql`."
          );
          return;
        }

        if (adminRow) {
          const statusRes = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
          const status = await statusRes.json().catch(() => ({ verified: false }));
          if (status.verified) {
            router.replace(redirectTo);
          } else {
            const { data: sessionData } = await supabase.auth.getSession();
            const t = sessionData.session?.access_token;
            const methodRes = t
              ? await fetch("/api/fusion-xpress/2fa/method", { headers: { Authorization: `Bearer ${t}` } })
              : null;
            const methodData = methodRes?.ok ? ((await methodRes.json().catch(() => ({}))) as { hasTotp?: boolean }) : {};
            setHasTotp(!!methodData.hasTotp);
            setTwoFactorMethod(methodData.hasTotp ? "totp" : "email");
            setStep("code");
            setLoginEmail(userEmail);
          }
        }
        return;
      }

      if (memberRow) {
        const statusRes = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
        const status = await statusRes.json().catch(() => ({ verified: false }));
        if (status.verified) {
          router.replace(redirectTo);
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          const t = sessionData.session?.access_token;
          const methodRes = t
            ? await fetch("/api/fusion-xpress/2fa/method", { headers: { Authorization: `Bearer ${t}` } })
            : null;
          const methodData = methodRes?.ok ? ((await methodRes.json().catch(() => ({}))) as { hasTotp?: boolean }) : {};
          setHasTotp(!!methodData.hasTotp);
          setTwoFactorMethod(methodData.hasTotp ? "totp" : "email");
          setStep("code");
          setLoginEmail(userEmail);
        }
      }
    };

    check();
  }, [router]);

  const requirePortalMemberOrSignOut = async (userId: string) => {
    const { data: memberRow, error: memberErr } = await supabase
      .from("portal_members")
      .select("user_id,role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr && isMissingPortalMembersTable(memberErr)) {
      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (adminErr && isMissingAdminUsersTable(adminErr)) {
        await supabase.auth.signOut();
        throw new Error(
          "Fusion Xpress portal is not configured yet. Run `database/ticketing_voting_mvp.sql` and `database/ticketing_voting_mvp_patch_04_portal_members_rbac.sql`."
        );
      }
      if (adminErr) throw adminErr;
      if (!adminRow) {
        await supabase.auth.signOut();
        throw new Error(
          "Access denied. Hiring managers can register from the job board under “For employers”, then sign in here. Otherwise ask an admin to add your account to the portal."
        );
      }
      return;
    }
    if (memberErr) throw memberErr;

    if (!memberRow) {
      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (adminErr && isMissingAdminUsersTable(adminErr)) {
        await supabase.auth.signOut();
        throw new Error(
          "Fusion Xpress portal is not configured yet. Run `database/ticketing_voting_mvp.sql` and `database/ticketing_voting_mvp_patch_04_portal_members_rbac.sql`."
        );
      }
      if (adminErr) throw adminErr;
      if (adminRow) return;

      await supabase.auth.signOut();
      throw new Error(
        "Access denied. Hiring managers can register from the job board under “For employers”, then sign in here. Otherwise ask an admin to add your account to the portal."
      );
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResetSent(false);

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) throw signInErr;

      const userId = data.user?.id;
      if (!userId) throw new Error("Sign in failed. Please try again.");

      await maybeClaimAdmin();
      await requirePortalMemberOrSignOut(userId);

      const token = data.session?.access_token;
      if (!token) throw new Error("Session missing. Please try again.");

      const methodRes = await fetch("/api/fusion-xpress/2fa/method", { headers: { Authorization: `Bearer ${token}` } });
      const methodData = (await methodRes.json().catch(() => ({}))) as { hasTotp?: boolean };
      const useTotp = !!methodData.hasTotp;

      if (!useTotp) {
        const sendRes = await fetch("/api/fusion-xpress/send-login-code", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!sendRes.ok) {
          const err = await sendRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Failed to send verification code to your email.");
        }
      }

      setLoginEmail(email.trim());
      setHasTotp(useTotp);
      setTwoFactorMethod(useTotp ? "totp" : "email");
      setStep("code");
      setCode("");
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const codeDigits = code.trim().replace(/\D/g, "").slice(0, 6);
    if (codeDigits.length !== 6) {
      setError("Enter the 6-digit code from your email or authenticator app.");
      return;
    }
    setCodeLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Session expired. Please sign in again.");
        setStep("login");
        return;
      }
      const res = await fetch("/api/fusion-xpress/verify-login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: codeDigits, method: twoFactorMethod }),
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "Invalid or expired code.");
      router.replace(redirectTo);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Invalid or expired code.");
    } finally {
      setCodeLoading(false);
    }
  };

  const onResendCode = async () => {
    setError(null);
    setResendCodeLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("Session expired. Please sign in again.");
        setStep("login");
        return;
      }
      const res = await fetch("/api/fusion-xpress/send-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to resend code.");
      }
      setTwoFactorMethod("email");
      setError(null);
      setCode("");
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Failed to resend code.");
    } finally {
      setResendCodeLoading(false);
    }
  };

  const onForgotPassword = async () => {
    setError(null);
    setResetSent(false);
    const e = email.trim();
    if (!e) {
      setError('Enter your email first, then click “Forgot password”.');
      return;
    }

    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: `${window.location.origin}/fusion-xpress/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const cardShadow = layout === "embedded" ? "shadow-sm" : "shadow-2xl";

  return (
    <div className={className}>
      {showEmployerBanner && (
        <div
          className="mb-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-950 text-left"
          role="status"
        >
          <strong className="font-semibold">Hiring account:</strong> Use the email and password from your registration below.
          After you enter the one-time code from your email, you will land in the dashboard—open <strong>Job listings</strong> in
          the sidebar to create and publish roles. Listing details and filters are managed there, not on this public page.
        </div>
      )}

      <div className={`bg-white rounded-2xl ${cardShadow} border border-gray-100 overflow-hidden`}>
        <div className={`border-b border-gray-100 ${layout === "embedded" ? "p-5" : "p-8"}`}>
          <div className="flex items-center justify-center">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
              <Image
                src={logoSrc}
                alt={logoAlt}
                width={56}
                height={56}
                className="object-contain p-1.5"
                priority
              />
            </div>
          </div>
          <h2
            className={`mt-4 font-extrabold text-gray-900 text-center ${
              layout === "embedded" ? "text-xl md:text-2xl" : "mt-5 text-3xl"
            }`}
          >
            {step === "code" ? "Enter verification code" : "Sign in to your account"}
          </h2>
        </div>

        <div className={layout === "embedded" ? "p-5" : "p-8"}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {step === "code" ? (
            <form onSubmit={onVerifyCode} className="space-y-4">
              {twoFactorMethod === "totp" ? (
                <p className="text-gray-600 text-sm">
                  Enter the 6-digit code from your authenticator app (e.g. Google Authenticator).
                </p>
              ) : (
                <p className="text-gray-600 text-sm">
                  We sent a 6-digit code to <strong>{loginEmail}</strong>. Enter it below to access the dashboard.
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={codeLoading || code.trim().replace(/\D/g, "").length !== 6}
                  className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-lg font-semibold hover:from-black hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {codeLoading ? "Verifying…" : "Verify and continue"}
                </button>
                {twoFactorMethod === "email" ? (
                  <button
                    type="button"
                    onClick={onResendCode}
                    disabled={resendCodeLoading}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60"
                  >
                    {resendCodeLoading ? "Sending…" : "Resend code"}
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {twoFactorMethod === "totp" ? (
                  <button
                    type="button"
                    onClick={onResendCode}
                    disabled={resendCodeLoading}
                    className="text-primary-700 font-medium hover:underline"
                  >
                    Send code to email instead
                  </button>
                ) : hasTotp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorMethod("totp");
                      setError(null);
                      setCode("");
                    }}
                    className="text-primary-700 font-medium hover:underline"
                  >
                    Use authenticator app instead
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setStep("login");
                  setCode("");
                  setLoginEmail("");
                  setError(null);
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Use a different account
              </button>
            </form>
          ) : (
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
                    placeholder="you@company.com"
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-semibold text-primary-700 hover:text-primary-800"
                  disabled={loading}
                >
                  Forgot password
                </button>
                {resetSent && <span className="text-xs text-green-700 font-semibold">Reset link sent</span>}
              </div>

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

                <span className="text-xs text-gray-500">{rememberMe ? "Session saved" : "Session not saved"}</span>
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white py-3 rounded-lg font-semibold hover:from-black hover:to-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
