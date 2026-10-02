"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Camera, KeyRound, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { Recaptcha, RecaptchaV3Script, executeRecaptchaV3, type RecaptchaClientVersion } from "@/components/Recaptcha";

type Step = "form" | "code";

export default function LoginPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    login,
    register,
    verifyEmail,
    resendVerificationCode,
    completeLoginVerification,
    sendLoginVerificationCode,
    loading: authLoading,
    user,
  } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<Step>("form");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loginVerified, setLoginVerified] = useState<boolean | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [resetSent, setResetSent] = useState(false);
  /** v2 token for “Resend code” on the login verification step only */
  const [resendRecaptchaToken, setResendRecaptchaToken] = useState<string | null>(null);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState("");
  const [recaptchaVersion, setRecaptchaVersion] = useState<RecaptchaClientVersion>("v2");

  // Only redirect to /application after the email/2FA code has been verified.
  // Supabase `isAuthenticated` becomes true right after password sign-in, which is before verification.
  useEffect(() => {
    if (authLoading) return;

    (async () => {
      try {
        const res = await fetch("/api/auth/check-verified", { credentials: "include" });
        const json = (await res.json().catch(() => ({}))) as { verified?: boolean };
        setLoginVerified(!!json.verified);
      } catch {
        setLoginVerified(false);
      }
    })();
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && loginVerified) {
      router.push("/application");
      return;
    }

    // If user is signed in but not verified, ensure we show the code step.
    if (isAuthenticated && loginVerified === false && user?.email) {
      setMode("login");
      setResendRecaptchaToken(null);
      setStep("code");
      setFormData((prev) => ({ ...prev, email: user.email || prev.email }));
    }
  }, [authLoading, isAuthenticated, loginVerified, user?.email, router]);

  // Fetch reCAPTCHA site key at runtime so it works even when env is added after build (e.g. Vercel)
  useEffect(() => {
    fetch("/api/recaptcha-site-key")
      .then((r) => r.json())
      .then((data: { siteKey?: string; version?: string }) => {
        setRecaptchaSiteKey(data?.siteKey ?? "");
        setRecaptchaVersion(data?.version === "v3" ? "v3" : "v2");
      })
      .catch(() => {
        setRecaptchaSiteKey("");
        setRecaptchaVersion("v2");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!formData.name || !formData.email || !formData.password) {
          setError("Please fill in all fields");
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const result = await register(formData.name, formData.email, formData.password);
        if (result.success) {
          // After sign up, send the user back to sign-in flow.
          setSignupSuccess(true);
          setMode("login");
          setStep("form");
          setFormData({ name: "", email: "", password: "", confirmPassword: "" });
        } else {
          setError(result.error || "Registration failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (!formData.email || !formData.password) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }
      const result = await login(formData.email, formData.password);
      if (result.success && result.requiresVerification) {
        setResendRecaptchaToken(null);
        setStep("code");
      } else if (result.success) {
        router.push("/application");
      } else {
        if (result.requiresVerification) {
          setResendRecaptchaToken(null);
          setStep("code");
        } else {
          setError(result.error || "Login failed. Please check your credentials.");
        }
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const codeDigits = code.trim().replace(/\D/g, "").slice(0, 6);
    if (codeDigits.length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await verifyEmail(formData.email, codeDigits);
        if (result.success) {
          router.push("/application");
        } else {
          setError(result.error || "Invalid or expired code.");
          setLoading(false);
        }
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/verify-login-verification-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: codeDigits }),
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Invalid or expired code.");
        setLoading(false);
        return;
      }
      await completeLoginVerification();
      router.push("/application");
    } catch (err: any) {
      setError(err.message ?? "Verification failed.");
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setResending(true);
    try {
      if (mode === "signup") {
        const result = await resendVerificationCode(formData.email);
        if (result.success) {
          setError("");
        } else {
          setError(result.error ?? "Failed to resend code.");
        }
      } else {
        let resendToken: string | null | undefined;
        if (recaptchaSiteKey) {
          if (recaptchaVersion === "v2") {
            if (!resendRecaptchaToken) {
              setError("Complete the security check below, then tap Resend code again.");
              setResending(false);
              return;
            }
            resendToken = resendRecaptchaToken;
          } else {
            try {
              resendToken = await executeRecaptchaV3(recaptchaSiteKey, "resend_login_code");
            } catch {
              setError("Security check could not run. Wait a moment and try Resend again.");
              setResending(false);
              return;
            }
          }
        }
        const result = await sendLoginVerificationCode(resendToken ?? null);
        if (result.success) {
          setError("");
          setResendRecaptchaToken(null);
        } else {
          setError(result.error ?? "Failed to resend code.");
        }
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const backToForm = () => {
    setStep("form");
    setCode("");
    setError("");
    setSignupSuccess(false);
    setResendRecaptchaToken(null);
  };

  const onForgotPassword = async () => {
    setError("");
    setResetSent(false);
    const value = formData.email.trim();
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
      setError(err instanceof Error ? err.message : "Unable to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  const underlineFieldClass =
    "w-full border-0 bg-transparent py-1.5 text-[15px] font-light text-slate-600 outline-none placeholder:font-light placeholder:italic placeholder:text-slate-400 focus:ring-0";

  const pageBackground = {
    backgroundImage:
      "linear-gradient(180deg, #f3d4d6 0%, #e8d5d8 18%, #d5e4e8 48%, #b7e4e2 78%, #9fd9d6 100%)",
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-montserrat" style={pageBackground}>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-800 border-t-transparent" />
      </div>
    );
  }

  const heading =
    step === "code" ? "Verify Login" : mode === "login" ? "User Login" : "Sign Up";

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16 font-montserrat"
      style={pageBackground}
    >
      <Link
        href="/"
        className="absolute left-4 top-4 text-xs font-medium text-primary-800/70 hover:text-primary-900"
      >
        Back
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-[380px] pt-12"
        aria-label={mode === "signup" ? "Create account" : "Sign in"}
      >
        <div className="absolute left-1/2 top-0 z-20 flex h-[92px] w-[92px] -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-[0_6px_18px_rgba(15,47,100,0.16)]">
          {step === "code" ? (
            <KeyRound className="h-10 w-10 text-primary-800" strokeWidth={1.5} />
          ) : mode === "signup" ? (
            <User className="h-10 w-10 text-primary-800" strokeWidth={1.5} />
          ) : (
            <Camera className="h-10 w-10 text-primary-800" strokeWidth={1.5} />
          )}
        </div>

        <div className="overflow-hidden rounded-[4px] bg-white shadow-[0_18px_40px_rgba(15,47,100,0.18)]">
          <header className="bg-primary-800 pb-5 pt-[3.35rem] text-center">
            <h1 className="text-[22px] font-light uppercase tracking-[0.28em] text-white">{heading}</h1>
          </header>

          <div className="px-9 pb-9 pt-8">
            {error ? <p className="mb-5 text-center text-sm text-red-600">{error}</p> : null}
            {(signupSuccess || resetSent) && !error ? (
              <p className="mb-5 text-center text-sm text-secondary-700">
                {signupSuccess
                  ? "Account created. Please sign in to continue."
                  : "Password reset link sent. Check your email, then open the link to set a new password."}
              </p>
            ) : null}

            {step === "code" ? (
              <form className="space-y-8" onSubmit={handleVerifyCode}>
                <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                  <KeyRound className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                  <input
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

                {mode === "login" && recaptchaSiteKey && recaptchaVersion === "v2" ? (
                  <div className="space-y-2">
                    <p className="text-center text-xs italic text-slate-400">
                      To resend your code, complete the check below, then tap Resend code.
                    </p>
                    <div className="flex justify-center">
                      <Recaptcha siteKey={recaptchaSiteKey} onVerify={setResendRecaptchaToken} />
                    </div>
                  </div>
                ) : null}
                {mode === "login" && recaptchaSiteKey && recaptchaVersion === "v3" ? (
                  <>
                    <RecaptchaV3Script siteKey={recaptchaSiteKey} />
                    <p className="text-center text-xs italic text-slate-400">
                      Resending your code uses Google reCAPTCHA. Tap Resend code to run the check.
                    </p>
                  </>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || code.trim().replace(/\D/g, "").length !== 6}
                  className="w-full bg-primary-800 py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? "Verifying..." : "Verify"}
                </button>

                <div className="flex items-center justify-between text-[13px] italic text-slate-400">
                  <button type="button" onClick={backToForm} className="hover:text-slate-600">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={
                      resending ||
                      (!!recaptchaSiteKey &&
                        mode === "login" &&
                        recaptchaVersion === "v2" &&
                        !resendRecaptchaToken)
                    }
                    className="hover:text-slate-600 disabled:opacity-50"
                  >
                    {resending ? "Sending..." : "Resend code"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-8" onSubmit={handleSubmit}>
                {mode === "signup" ? (
                  <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                    <User className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={underlineFieldClass}
                      placeholder="Full Name"
                      aria-label="Full Name"
                    />
                  </div>
                ) : null}

                <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                  <Mail className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={underlineFieldClass}
                    placeholder="Password"
                    aria-label="Password"
                  />
                </div>

                {mode === "signup" ? (
                  <div className="flex items-end gap-3 border-b border-slate-400/80 pb-2">
                    <Lock className="mb-1 h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.75} />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={underlineFieldClass}
                      placeholder="Confirm Password"
                      aria-label="Confirm Password"
                    />
                  </div>
                ) : null}

                {mode === "login" ? (
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
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-800 py-3 text-[15px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? (mode === "login" ? "Signing in..." : "Creating...") : mode === "login" ? "Login" : "Sign Up"}
                </button>

                <p className="text-center text-[13px] italic text-slate-400">
                  {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setError("");
                      setSignupSuccess(false);
                      setResetSent(false);
                      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                    }}
                    className="hover:text-slate-600"
                  >
                    {mode === "login" ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </motion.section>
    </main>
  );
}
