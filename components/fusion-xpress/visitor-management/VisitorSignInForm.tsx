"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Mail } from "lucide-react";

import { businessTotpSetupUrl } from "@/lib/auth/business-totp";
import { supabase } from "@/lib/supabase";
import { hasVisitorManagementAccess, VISITOR_ONLY_DASHBOARD_PREFIX } from "@/lib/visitors/visitor-only-access";

type Step = "login" | "code";

function parseFeatures(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((f) => String(f).toLowerCase().trim()) : [];
}

async function assertVisitorPortalMember(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("portal_members")
    .select("role, features")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    await supabase.auth.signOut();
    throw new Error("This account is not registered for Smart Visitor Management.");
  }

  const role = String(data.role ?? "client").toLowerCase();
  const features = parseFeatures(data.features) as import("@/contexts/PortalContext").PortalFeature[];

  if (role === "admin" || role === "manager") {
    await supabase.auth.signOut();
    throw new Error("Staff accounts should use the Fusion Xpress admin login.");
  }

  if (!hasVisitorManagementAccess(role, features, false)) {
    await supabase.auth.signOut();
    throw new Error("Your account does not include Visitor Management access.");
  }
}

export default function VisitorSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [passwordJustReset, setPasswordJustReset] = useState(false);

  const [step, setStep] = useState<Step>("login");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCodeLoading, setResendCodeLoading] = useState(false);
  const [hasTotp, setHasTotp] = useState(false);
  const [totpRequired, setTotpRequired] = useState(true);
  type TwoFactorMethod = "email" | "totp";
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>("email");

  const canSubmit = useMemo(() => email.trim() && password.length > 0, [email, password]);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("passwordReset") === "1") {
      setPasswordJustReset(true);
    }

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;
      try {
        await assertVisitorPortalMember(uid);
        const statusRes = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
        const status = (await statusRes.json().catch(() => ({}))) as { verified?: boolean };
        if (status.verified) router.replace(VISITOR_ONLY_DASHBOARD_PREFIX);
      } catch {
        /* not a visitor session */
      }
    };
    void check();
  }, [router]);

  const afterPasswordSignIn = async (token: string) => {
    const methodRes = await fetch("/api/fusion-xpress/2fa/method", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const methodData = (await methodRes.json().catch(() => ({}))) as {
      hasTotp?: boolean;
      totpRequired?: boolean;
    };
    const useTotp = !!methodData.hasTotp;
    setHasTotp(useTotp);
    setTotpRequired(methodData.totpRequired !== false);

    if (methodData.totpRequired !== false && !useTotp) {
      router.replace(businessTotpSetupUrl(VISITOR_ONLY_DASHBOARD_PREFIX));
      return;
    }

    const sendRes = await fetch("/api/fusion-xpress/send-login-code", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!sendRes.ok) {
      const err = await sendRes.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to send verification code.");
    }

    setTwoFactorMethod("email");
    setStep("code");
    setCode("");
  };

  const onResendCode = async () => {
    setError(null);
    setResendCodeLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");

      const res = await fetch("/api/fusion-xpress/send-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to resend code.");
      }
      setTwoFactorMethod("email");
      setCode("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResendCodeLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        const msg = signInErr.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          throw new Error(
            "Please verify your email first. Check your inbox or use the verification page linked below."
          );
        }
        throw signInErr;
      }

      const uid = data.user?.id;
      const token = data.session?.access_token;
      if (!uid || !token) throw new Error("Sign in failed.");

      await assertVisitorPortalMember(uid);
      await afterPasswordSignIn(token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");

      const codeDigits = code.trim().replace(/\D/g, "").slice(0, 6);
      if (codeDigits.length !== 6) throw new Error("Enter the 6-digit code.");

      const res = await fetch("/api/fusion-xpress/verify-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: codeDigits, method: twoFactorMethod }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Invalid code");

      router.replace(VISITOR_ONLY_DASHBOARD_PREFIX);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setCodeLoading(false);
    }
  };

  const onForgotPassword = async () => {
    setError(null);
    const value = email.trim();
    if (!value) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/fusion-xpress/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to send reset link.";
      const lower = msg.toLowerCase();
      if (lower.includes("redirect") || lower.includes("not allowed")) {
        setError(
          "Password recovery is misconfigured (reset redirect URL not allowlisted in Supabase Auth). Contact support."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full min-h-[48px] rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-base outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm";
  const btnPrimary =
    "inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-secondary-400 px-4 py-3 text-sm font-bold text-gray-900 transition hover:bg-secondary-300 active:scale-[0.99] disabled:opacity-60";

  return (
    <div className="mt-5 sm:mt-6">
      <h1 className="text-xl font-extrabold text-gray-900 sm:text-2xl">
        {step === "login" ? "Sign in to your account" : "Enter verification code"}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {step === "login"
          ? "Sign in as your organization to manage guest check-ins, approvals, and QR passes."
          : twoFactorMethod === "totp"
            ? "Enter the 6-digit code from Google Authenticator."
            : `We sent a 6-digit code to ${email.trim() || "your email"}. Enter it below to continue.`}
      </p>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{error}</p>
          {error.toLowerCase().includes("verify your email") ? (
            <Link
              href={`/fusion-xpress/smart-visitor-management/verify-email?email=${encodeURIComponent(email.trim())}`}
              className="mt-2 inline-block font-semibold text-primary-700 hover:underline"
            >
              Go to email verification
            </Link>
          ) : null}
        </div>
      ) : null}
      {(passwordJustReset || resetSent) && !error ? (
        <p className="mt-4 text-sm text-primary-700">
          {passwordJustReset
            ? "Password updated. Sign in with your new password."
            : "Password reset link sent. Check your email, then open the link to set a new password."}
        </p>
      ) : null}

      {step === "code" ? (
        <form className="mt-6 space-y-4" onSubmit={onVerifyCode}>
          <label className="block text-sm font-medium text-gray-700" htmlFor="visitor-code">
            Verification code
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="visitor-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputClass} pl-10 text-center font-mono tracking-[0.35em]`}
              placeholder="000000"
            />
          </div>
          <button type="submit" disabled={codeLoading || code.length !== 6} className={btnPrimary}>
            {codeLoading ? "Verifying…" : "Verify and continue"}
          </button>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {twoFactorMethod === "email" ? (
              <button
                type="button"
                onClick={() => void onResendCode()}
                disabled={resendCodeLoading}
                className="font-semibold text-primary-700 hover:underline disabled:opacity-60"
              >
                {resendCodeLoading ? "Sending…" : "Resend code"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onResendCode()}
                disabled={resendCodeLoading}
                className="font-semibold text-primary-700 hover:underline disabled:opacity-60"
              >
                Send code to email instead
              </button>
            )}
            {hasTotp && twoFactorMethod === "email" ? (
              <button
                type="button"
                onClick={() => {
                  setTwoFactorMethod("totp");
                  setCode("");
                  setError(null);
                }}
                className="font-semibold text-primary-700 hover:underline"
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
              setError(null);
            }}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            Use a different account
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-start text-sm">
            <button
              type="button"
              onClick={() => void onForgotPassword()}
              className="min-h-[44px] font-semibold text-primary-700 hover:text-primary-900"
            >
              Forgot password?
            </button>
          </div>
          <button type="submit" disabled={loading || !canSubmit} className={btnPrimary}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-600">
        New here?{" "}
        <Link href="/fusion-xpress/smart-visitor-management/sign-up" className="font-semibold text-primary-700">
          Create an account
        </Link>
      </p>
    </div>
  );
}
