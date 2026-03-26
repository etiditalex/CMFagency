"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, User, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Recaptcha, RecaptchaV3Script, executeRecaptchaV3, type RecaptchaClientVersion } from "@/components/Recaptcha";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-32 md:pt-40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4 pt-32 md:pt-40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-8 text-white text-center">
            <div className="mb-4">
              <Image
                src={BRAND_LOGO_URL}
                alt="Changer Fusions Logo"
                width={120}
                height={60}
                className="mx-auto object-contain"
                priority
              />
            </div>
            <h2 className="text-3xl font-bold mb-2">
              {step === "code"
                ? "Verify your email"
                : mode === "login"
                  ? "Welcome Back"
                  : "Create Account"}
            </h2>
            <p className="text-white/90">
              {step === "code"
                ? "Enter the 6-digit code we sent to your email"
                : mode === "login"
                  ? "Sign in with your email and password"
                  : "Create your account with email"}
            </p>
          </div>

          <div className="p-8">
            {step === "code" ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-sm text-gray-600">
                  We sent a code to <strong>{formData.email}</strong>
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-xl font-mono tracking-widest"
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </div>
                {mode === "login" && recaptchaSiteKey && recaptchaVersion === "v2" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 text-center">
                      To resend your code, complete the check below, then tap <strong>Resend code</strong>.
                    </p>
                    <div className="flex justify-center">
                      <Recaptcha siteKey={recaptchaSiteKey} onVerify={setResendRecaptchaToken} />
                    </div>
                  </div>
                )}
                {mode === "login" && recaptchaSiteKey && recaptchaVersion === "v3" && (
                  <>
                    <RecaptchaV3Script siteKey={recaptchaSiteKey} />
                    <p className="text-xs text-gray-500 text-center">
                      Resending your code uses Google reCAPTCHA (badge at the bottom-right). Tap{" "}
                      <strong>Resend code</strong> to run the check.
                    </p>
                  </>
                )}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || code.trim().replace(/\D/g, "").length !== 6}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying…" : "Verify and continue"}
                </button>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={backToForm}
                    className="text-sm text-gray-600 hover:text-primary-600"
                  >
                    ← Back
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
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                    Resend code
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                  {signupSuccess && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      Account created. Please sign in to continue.
                    </div>
                  )}
                {mode === "signup" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        required={mode === "signup"}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        required={mode === "signup"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {mode === "login" ? "Signing in…" : "Create account…"}
                    </span>
                  ) : (
                    mode === "login" ? "Sign In" : "Create Account"
                  )}
                </button>
              </form>
            )}

            {step === "form" && (
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setError("");
                      setSignupSuccess(false);
                      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                    }}
                    className="text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    {mode === "login" ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
