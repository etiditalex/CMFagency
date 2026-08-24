"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, KeyRound, Lock, Mail } from "lucide-react";

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

export function AdminLoginExperience({ initialErrorMessage = null }: AdminLoginExperienceProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(initialErrorMessage);
  const [resetSent, setResetSent] = useState(false);
  const [passwordJustReset, setPasswordJustReset] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("passwordReset") === "1") {
      setPasswordJustReset(true);
    }
  }, []);

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
      setTwoFactorMethod("email");
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
      const { loginWithPassword } = await import("@/lib/auth/password-login");
      const { session } = await loginWithPassword(email, password);

      const userId = session.user?.id;
      if (!userId) throw new Error("Sign in failed. Please try again.");

      await maybeClaimAdmin();
      await requirePortalMemberOrSignOut(userId);

      const token = session.access_token;
      if (!token) throw new Error("Session missing. Please try again.");

      const methodRes = await fetch("/api/fusion-xpress/2fa/method", { headers: { Authorization: `Bearer ${token}` } });
      const methodData = (await methodRes.json().catch(() => ({}))) as { hasTotp?: boolean };
      const useTotp = !!methodData.hasTotp;

      const sendRes = await fetch("/api/fusion-xpress/send-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to send verification code.");
      }

      setLoginEmail(email.trim());
      setHasTotp(useTotp);
      setTwoFactorMethod("email");
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
      const res = await fetch("/api/fusion-xpress/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unable to send reset link.");
      setResetSent(true);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const underlineFieldClass =
    "w-full border-0 bg-transparent py-1.5 text-[15px] font-light text-slate-600 outline-none placeholder:font-light placeholder:italic placeholder:text-slate-400 focus:ring-0";

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 font-montserrat"
      style={{
        backgroundImage:
          "linear-gradient(180deg, #f3d4d6 0%, #e8d5d8 18%, #d5e4e8 48%, #b7e4e2 78%, #9fd9d6 100%)",
      }}
    >
      <Link
        href="/fusion-xpress"
        className="absolute left-4 top-4 text-xs font-medium text-primary-800/70 hover:text-primary-900"
      >
        Back
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-[380px] pt-12"
        aria-label="Fusion Xpress admin sign in"
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
            <h1 className="text-[22px] font-light uppercase tracking-[0.28em] text-white">
              {step === "code" ? "Verify Login" : "User Login"}
            </h1>
          </header>

          <div className="px-9 pb-9 pt-8">
            {error ? (
              <p className="mb-5 text-center text-sm text-red-600">{error}</p>
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
                <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                  <KeyRound className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                  <input
                    id="verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${underlineFieldClass} tracking-[0.35em]`}
                    placeholder="Code"
                    aria-label="Verification code"
                  />
                </div>

                <button
                  type="submit"
                  disabled={codeLoading || code.trim().replace(/\D/g, "").length !== 6}
                  className="w-full bg-primary-800 py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {codeLoading ? "Verifying..." : "Verify"}
                </button>

                <div className="flex items-center justify-between text-[13px] italic text-slate-400">
                  {twoFactorMethod === "email" ? (
                    <button type="button" onClick={onResendCode} disabled={resendCodeLoading} className="hover:text-slate-600">
                      {resendCodeLoading ? "Sending..." : "Resend code"}
                    </button>
                  ) : (
                    <button type="button" onClick={onResendCode} disabled={resendCodeLoading} className="hover:text-slate-600">
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
                      className="hover:text-slate-600"
                    >
                      Use authenticator
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <form className="space-y-8" onSubmit={onSubmit}>
                <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                  <Mail className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                  <input
                    id="admin-email"
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
                    id="admin-password"
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
                  <button type="button" onClick={onForgotPassword} disabled={loading} className="hover:text-slate-600">
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
              </form>
            )}
          </div>
        </div>
      </motion.section>
    </main>
  );
}
