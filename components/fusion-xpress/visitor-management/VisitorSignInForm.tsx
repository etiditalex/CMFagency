"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, KeyRound, Lock, Mail } from "lucide-react";

import { businessTotpSetupUrl } from "@/lib/auth/business-totp";
import { supabase } from "@/lib/supabase";
import { hasVisitorManagementAccess, VISITOR_ONLY_DASHBOARD_PREFIX } from "@/lib/visitors/visitor-only-access";

type Step = "login" | "code";

function safeAppRedirect(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/app")) return null;
  if (value.startsWith("//") || value.includes("://")) return null;
  return value;
}

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
  const [rememberMe, setRememberMe] = useState(true);
  const [hasTotp, setHasTotp] = useState(false);
  const [totpRequired, setTotpRequired] = useState(true);
  type TwoFactorMethod = "email" | "totp";
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>("email");

  const canSubmit = useMemo(() => email.trim() && password.length > 0, [email, password]);

  const afterAuthPath = () => {
    if (typeof window === "undefined") return VISITOR_ONLY_DASHBOARD_PREFIX;
    return (
      safeAppRedirect(new URLSearchParams(window.location.search).get("redirect")) ??
      VISITOR_ONLY_DASHBOARD_PREFIX
    );
  };

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
        if (status.verified) router.replace(afterAuthPath());
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
      router.replace(businessTotpSetupUrl(afterAuthPath()));
      return;
    }

    if (useTotp) {
      setTwoFactorMethod("totp");
      setStep("code");
      setCode("");
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
      const { loginWithPassword } = await import("@/lib/auth/password-login");
      let session;
      try {
        ({ session } = await loginWithPassword(email, password));
      } catch (signInErr: unknown) {
        const msg = (signInErr instanceof Error ? signInErr.message : "").toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          throw new Error(
            "Please verify your email first. Check your inbox or use the verification page linked below."
          );
        }
        throw signInErr;
      }

      const uid = session.user?.id;
      const token = session.access_token;
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

      router.replace(afterAuthPath());
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
      const res = await fetch("/api/fusion-xpress/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to send reset link.");
      setResetSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const underlineFieldClass =
    "w-full border-0 bg-transparent py-1.5 text-[15px] font-light text-slate-600 outline-none placeholder:font-light placeholder:italic placeholder:text-slate-400 focus:ring-0";
  const heading =
    step === "code" ? (twoFactorMethod === "totp" ? "Authenticator" : "Verify Login") : "User Login";

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative w-full max-w-[380px] pt-12"
      aria-label="Smart management sign in"
    >
      <div className="absolute left-1/2 top-0 z-20 flex h-[92px] w-[92px] -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(15,47,100,0.16)]">
        {step === "code" ? (
          <KeyRound className="h-10 w-10 text-primary-800" strokeWidth={1.5} />
        ) : (
          <Camera className="h-10 w-10 text-primary-800" strokeWidth={1.5} />
        )}
      </div>

      <div className="overflow-hidden rounded-[4px] bg-white shadow-[0_18px_40px_rgba(15,47,100,0.18)]">
        <header className="bg-primary-800 pb-5 pt-[3.35rem] text-center">
          <h1 className="text-[22px] font-light uppercase tracking-[0.22em] text-white">{heading}</h1>
        </header>

        <div className="px-9 pb-9 pt-8">
          {error ? (
            <p className="mb-5 text-center text-sm text-red-600">
              {error}{" "}
              {error.toLowerCase().includes("verify your email") ? (
                <Link
                  href={`/fusion-xpress/smart-visitor-management/verify-email?email=${encodeURIComponent(email.trim())}`}
                  className="font-medium text-primary-800 hover:underline"
                >
                  Verify email
                </Link>
              ) : null}
            </p>
          ) : null}
          {(passwordJustReset || resetSent) && !error ? (
            <p className="mb-5 text-center text-sm text-secondary-700">
              {passwordJustReset
                ? "Password updated. Sign in with your new password."
                : "Password reset link sent. Check your email, then open the link to set a new password."}
            </p>
          ) : null}

          {step === "code" ? (
            <form className="space-y-8" onSubmit={onVerifyCode}>
              <p className="text-center text-[13px] text-slate-500">
                {twoFactorMethod === "totp"
                  ? "Enter the 6-digit code from Google Authenticator."
                  : `Enter the 6-digit code sent to ${email.trim() || "your email"}.`}
              </p>
              <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                <KeyRound className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                <input
                  id="visitor-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${underlineFieldClass} tracking-[0.35em]`}
                  placeholder={twoFactorMethod === "totp" ? "Authenticator code" : "Code"}
                  aria-label={twoFactorMethod === "totp" ? "Google Authenticator code" : "Email verification code"}
                />
              </div>
              <button
                type="submit"
                disabled={codeLoading || code.length !== 6}
                className="w-full bg-primary-800 py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {codeLoading ? "Verifying..." : "Verify"}
              </button>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                {twoFactorMethod === "email" ? (
                  <button
                    type="button"
                    onClick={() => void onResendCode()}
                    disabled={resendCodeLoading}
                    className="italic text-slate-400 hover:text-slate-600 disabled:opacity-60"
                  >
                    {resendCodeLoading ? "Sending..." : "Resend code"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onResendCode()}
                    disabled={resendCodeLoading}
                    className="italic text-slate-400 hover:text-slate-600 disabled:opacity-60"
                  >
                    Send email code
                  </button>
                )}
                {hasTotp ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (twoFactorMethod === "totp") return;
                      setTwoFactorMethod("totp");
                      setCode("");
                      setError(null);
                    }}
                    className={`font-medium text-primary-800 hover:text-primary-900 ${
                      twoFactorMethod === "totp" ? "underline" : ""
                    }`}
                  >
                    Google Authenticator
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
                className="w-full text-center text-[13px] italic text-slate-400 hover:text-slate-600"
              >
                Use a different account
              </button>
            </form>
          ) : (
            <form className="space-y-8" onSubmit={onSubmit}>
              <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                <Mail className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={underlineFieldClass}
                  placeholder="Email ID"
                  aria-label="Email ID"
                />
              </div>
              <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                <Lock className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={underlineFieldClass}
                  placeholder="Password"
                  aria-label="Password"
                />
              </div>
              <div className="flex items-center justify-between text-[13px] italic text-slate-400">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-3.5 w-3.5 shrink-0 appearance-none rounded-[2px] border border-slate-500 bg-white checked:border-slate-600 checked:bg-slate-600 checked:bg-[length:12px_12px] checked:bg-center checked:bg-no-repeat focus:outline-none focus:ring-0"
                    style={
                      rememberMe
                        ? {
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3.5 8.2 6.4 11l6.1-6.5' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                          }
                        : undefined
                    }
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => void onForgotPassword()}
                  disabled={loading}
                  className="hover:text-slate-600"
                >
                  Forgot Password?
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full bg-primary-800 py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
              <p className="text-center text-[13px] italic text-slate-400">
                New here?{" "}
                <Link href="/fusion-xpress/smart-visitor-management/sign-up" className="hover:text-slate-600">
                  Create an account
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </motion.section>
  );
}
