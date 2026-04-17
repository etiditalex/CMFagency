"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Lock, Mail, Shield } from "lucide-react";

import { supabase } from "@/lib/supabase";

type TwoFactorMethod = "email" | "totp";
type Step = "login" | "code";

type AdminLoginExperienceProps = {
  initialErrorMessage?: string | null;
};

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

function ParticleField() {
  const particles = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
      {particles.map((i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-secondary-200/30 blur-[1px]"
          style={{
            left: `${8 + i * 9}%`,
            top: `${10 + (i % 5) * 17}%`,
          }}
          animate={{ y: [0, -12, 0], opacity: [0.2, 0.65, 0.2] }}
          transition={{
            duration: 7 + (i % 4),
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

export function AdminLoginExperience({ initialErrorMessage = null }: AdminLoginExperienceProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(initialErrorMessage);
  const [resetSent, setResetSent] = useState(false);

  const [step, setStep] = useState<Step>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCodeLoading, setResendCodeLoading] = useState(false);
  const [hasTotp, setHasTotp] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>("email");

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

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
        throw new Error("Access denied. Your account is not registered for Fusion Xpress Admin.");
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
      throw new Error("Access denied. Your account is not registered for Fusion Xpress Admin.");
    }
  };

  useEffect(() => {
    const checkExistingSession = async () => {
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

      if (memberErr && isMissingPortalMembersTable(memberErr)) return;
      if (memberErr) return;
      if (!memberRow) return;

      const statusRes = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
      const status = await statusRes.json().catch(() => ({ verified: false }));
      if (status.verified) {
        router.replace("/dashboard");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const methodRes = token ? await fetch("/api/fusion-xpress/2fa/method", { headers: { Authorization: `Bearer ${token}` } }) : null;
      const methodData = methodRes?.ok ? ((await methodRes.json().catch(() => ({}))) as { hasTotp?: boolean }) : {};
      setHasTotp(!!methodData.hasTotp);
      setTwoFactorMethod(methodData.hasTotp ? "totp" : "email");
      setStep("code");
      setLoginEmail(userEmail);
    };

    checkExistingSession();
  }, [router]);

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
          throw new Error((err as { error?: string }).error ?? "Failed to send verification code.");
        }
      }

      setLoginEmail(email.trim());
      setHasTotp(useTotp);
      setTwoFactorMethod(useTotp ? "totp" : "email");
      setStep("code");
      setCode("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Unable to sign in.");
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
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Invalid or expired code.");
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
      if (!res.ok) throw new Error("Failed to resend code.");
      setTwoFactorMethod("email");
      setCode("");
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Failed to resend code.");
    } finally {
      setResendCodeLoading(false);
    }
  };

  const onForgotPassword = async () => {
    setError(null);
    setResetSent(false);
    const value = email.trim();
    if (!value) {
      setError("Enter your email first, then click Forgot Password.");
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
      setError((err as { message?: string })?.message ?? "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(44,165,124,0.10),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(30,88,202,0.12),transparent_42%),linear-gradient(120deg,#ffffff_0%,#f8fbff_52%,#f8fafc_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.03] sm:opacity-[0.05]" />
      <div className="hidden md:block absolute inset-y-0 right-0 w-[46%] bg-[radial-gradient(circle_at_right,rgba(44,165,124,0.12),transparent_70%)] opacity-40" />
      <div className="hidden md:block absolute inset-0 opacity-25">
        <div className="absolute left-[28%] top-[14%] h-[70%] w-px bg-gradient-to-b from-transparent via-secondary-300/60 to-transparent" />
        <div className="absolute left-[52%] top-[10%] h-[76%] w-px bg-gradient-to-b from-transparent via-primary-300/55 to-transparent" />
        <div className="absolute left-[28%] top-[38%] h-px w-[24%] bg-gradient-to-r from-secondary-200/45 to-transparent" />
        <div className="absolute left-[52%] top-[58%] h-px w-[16%] bg-gradient-to-r from-primary-200/45 to-transparent" />
      </div>
      <div className="hidden sm:block absolute inset-0 bg-[radial-gradient(circle,_rgba(15,23,42,0.2)_0.8px,transparent_0.8px)] bg-[size:8px_8px] [mask-image:linear-gradient(to_left,black_0%,transparent_70%)] opacity-[0.04]" />
      <ParticleField />

      <div className="relative z-10 flex min-h-screen items-start justify-center px-3 pb-6 pt-6 sm:items-center sm:p-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="w-full max-w-[28rem] rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:max-w-md sm:p-8"
          aria-label="Fusion Xpress admin sign in"
        >
          <div className="mb-5 flex items-center justify-between sm:mb-6">
            <Link href="/fusion-xpress" className="text-xs text-primary-700 transition hover:text-primary-900">
              Back
            </Link>
            <span className="rounded-full border border-secondary-300/60 bg-secondary-100 px-3 py-1 text-xs font-medium text-secondary-800">
              Admin Portal
            </span>
          </div>

          <div className="mb-5 sm:mb-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-400/25 to-primary-500/25 ring-1 ring-white/20">
              {step === "code" ? <KeyRound className="h-5 w-5 text-secondary-100" /> : <Shield className="h-5 w-5 text-secondary-100" />}
            </div>
            <p className="text-xs uppercase tracking-[0.26em] text-primary-700/80">Fusion Xpress</p>
            <h1 className="mt-2 text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">
              {step === "code" ? "Verify Your Login" : "Welcome Back, Admin"}
            </h1>
            <p className="mt-2 text-xs text-slate-600 sm:text-sm">
              {step === "code"
                ? "Enter your 6-digit verification code to continue."
                : "Secure access to campaign management, ticketing, and analytics."}
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</div>
          ) : null}

          {step === "code" ? (
            <form className="space-y-4" onSubmit={onVerifyCode}>
              <label className="block text-sm text-slate-700" htmlFor="verification-code">
                Verification code
              </label>
              <motion.input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                whileFocus={{ scale: 1.01 }}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3.5 font-mono tracking-[0.3em] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30 sm:tracking-[0.35em]"
                placeholder="000000"
                aria-label="Verification code"
              />

              <button
                type="submit"
                disabled={codeLoading || code.trim().replace(/\D/g, "").length !== 6}
                className="min-h-12 w-full rounded-xl bg-secondary-400 px-4 py-3 font-semibold text-black transition hover:bg-secondary-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {codeLoading ? "Verifying..." : "Verify and continue"}
              </button>

              <div className="flex flex-col gap-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                {twoFactorMethod === "email" ? (
                  <button type="button" onClick={onResendCode} disabled={resendCodeLoading} className="text-left hover:text-slate-900">
                    {resendCodeLoading ? "Sending..." : "Resend code"}
                  </button>
                ) : (
                  <button type="button" onClick={onResendCode} disabled={resendCodeLoading} className="text-left hover:text-slate-900">
                    Send email code
                  </button>
                )}
                {hasTotp && twoFactorMethod === "email" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactorMethod("totp");
                      setCode("");
                    }}
                    className="text-left hover:text-slate-900"
                  >
                    Use authenticator app
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="mb-2 block text-sm text-slate-700" htmlFor="admin-email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <motion.input
                    id="admin-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    whileFocus={{ scale: 1.01 }}
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                    placeholder="you@fusionxpress.com"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-700" htmlFor="admin-password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <motion.input
                    id="admin-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    whileFocus={{ scale: 1.01 }}
                    className="min-h-12 w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/40 bg-transparent text-primary-500 focus:ring-primary-400/50"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-left font-medium text-primary-300 hover:text-primary-200 sm:text-right"
                  disabled={loading}
                >
                  Forgot Password
                </button>
              </div>

              {resetSent ? <p className="text-xs text-secondary-200">Reset link sent to your email.</p> : null}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="min-h-12 w-full rounded-xl bg-secondary-400 px-4 py-3 font-semibold text-black transition hover:bg-secondary-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}
        </motion.section>
      </div>
    </main>
  );
}
