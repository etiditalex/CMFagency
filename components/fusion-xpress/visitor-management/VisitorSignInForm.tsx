"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Smartphone } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { hasVisitorManagementAccess, VISITOR_ONLY_DASHBOARD_PREFIX } from "@/lib/visitors/visitor-only-access";

type Step = "login" | "2fa-method" | "2fa-code";

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

  const [step, setStep] = useState<Step>("login");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCodeLoading, setResendCodeLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [has2faMethod, setHas2faMethod] = useState<{ hasTotp: boolean; methods: string[] } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"totp" | "email">("email");

  const canSubmit = useMemo(() => email.trim() && password.length > 0, [email, password]);

  useEffect(() => {
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
    check();
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
      if (!uid) throw new Error("Sign in failed.");

      setUserId(uid);
      await assertVisitorPortalMember(uid);

      // Check 2FA methods available
      const methodRes = await fetch(`/api/visitor-management/2fa-totp?user_id=${uid}`);
      const methods = (await methodRes.json().catch(() => ({}))) as { hasTotp?: boolean; methods?: string[] };
      setHas2faMethod(methods);

      // If no 2FA enabled, use email as default
      if (!methods.hasTotp) {
        setSelectedMethod("email");
        const sendRes = await fetch("/api/fusion-xpress/send-login-code", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session?.access_token}` },
        });
        if (!sendRes.ok) {
          const err = await sendRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Failed to send verification code.");
        }
        setStep("2fa-code");
      } else {
        // Show 2FA method selection
        setStep("2fa-method");
      }
      setCode("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const onSelectMethod = async (method: "totp" | "email") => {
    setSelectedMethod(method);
    setCode("");
    setError(null);

    if (method === "email") {
      setCodeLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const res = await fetch("/api/fusion-xpress/send-login-code", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session?.access_token}` },
        });
        if (!res.ok) throw new Error("Failed to send code");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send code");
        setCodeLoading(false);
        return;
      }
      setCodeLoading(false);
    }
    setStep("2fa-code");
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");

      let verifyEndpoint = "/api/fusion-xpress/verify-login-code";
      let verifyMethod = selectedMethod;

      // Use visitor-specific endpoint for TOTP
      if (selectedMethod === "totp") {
        verifyEndpoint = "/api/visitor-management/verify-2fa";
        const res = await fetch(verifyEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code, user_id: userId, method: "totp" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Invalid code");
      } else {
        // Email verification uses admin endpoint
        const res = await fetch(verifyEndpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ code, method: "email" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Invalid code");
      }

      router.replace(VISITOR_ONLY_DASHBOARD_PREFIX);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setCodeLoading(false);
    }
  };

  const onResendCode = async () => {
    setResendCodeLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired.");
      const res = await fetch("/api/fusion-xpress/send-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to resend code.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResendCodeLoading(false);
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
      setError(err instanceof Error ? err.message : "Unable to send reset link.");
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
        {step === "login" ? "Sign in to your account" : "Verify your login"}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {step === "login"
          ? "Sign in as your organization to manage guest check-ins, approvals, and QR passes."
          : step === "2fa-method"
            ? "Choose how to verify your identity."
            : "Enter the 6-digit code from your authenticator or email."}
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
      {resetSent ? <p className="mt-4 text-sm text-primary-700">Password reset link sent.</p> : null}

      {step === "2fa-method" && has2faMethod ? (
        <div className="mt-6 space-y-3">
          {has2faMethod.hasTotp && (
            <button
              onClick={() => onSelectMethod("totp")}
              className="flex min-h-[56px] w-full items-center gap-3 rounded-lg border-2 border-primary-300 bg-primary-50 px-4 py-3 text-left transition hover:bg-primary-100"
            >
              <Smartphone className="h-5 w-5 flex-shrink-0 text-primary-700" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Google Authenticator</p>
                <p className="text-xs text-gray-600">Use your authenticator app</p>
              </div>
            </button>
          )}
          <button
            onClick={() => onSelectMethod("email")}
            className="flex min-h-[56px] w-full items-center gap-3 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-left transition hover:bg-gray-50"
          >
            <Mail className="h-5 w-5 flex-shrink-0 text-gray-600" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Email</p>
              <p className="text-xs text-gray-600">Code sent to your email</p>
            </div>
          </button>
        </div>
      ) : step === "2fa-code" ? (
        <form className="mt-6 space-y-4" onSubmit={onVerifyCode}>
          <label className="block text-sm font-medium text-gray-700" htmlFor="visitor-code">
            Verification code
          </label>
          <input
            id="visitor-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full min-h-[52px] rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-mono tracking-[0.35em] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-xl"
            placeholder="000000"
          />
          <button
            type="submit"
            disabled={codeLoading || code.length !== 6}
            className={btnPrimary}
          >
            {codeLoading ? "Verifying…" : "Verify and continue"}
          </button>
          {selectedMethod === "email" && (
            <button
              type="button"
              onClick={onResendCode}
              disabled={resendCodeLoading}
              className="text-sm font-semibold text-primary-700 hover:text-primary-900"
            >
              {resendCodeLoading ? "Sending…" : "Resend code"}
            </button>
          )}
          {has2faMethod?.hasTotp && (
            <button
              type="button"
              onClick={() => setStep("2fa-method")}
              disabled={codeLoading}
              className="text-sm font-semibold text-gray-600 hover:text-gray-900"
            >
              Use different method
            </button>
          )}
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <div className="relative mt-1">
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
          <div className="relative mt-1">
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
              onClick={onForgotPassword}
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

  const [step, setStep] = useState<Step>("login");
  const [code, setCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendCodeLoading, setResendCodeLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim() && password.length > 0, [email, password]);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      try {
        await assertVisitorPortalMember(userId);
        const statusRes = await fetch("/api/fusion-xpress/login-status", { credentials: "include" });
        const status = (await statusRes.json().catch(() => ({}))) as { verified?: boolean };
        if (status.verified) router.replace(VISITOR_ONLY_DASHBOARD_PREFIX);
      } catch {
        /* not a visitor session */
      }
    };
    check();
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
      if (signInErr) {
        const msg = signInErr.message.toLowerCase();
        if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
          throw new Error(
            "Please verify your email first. Check your inbox or use the verification page linked below."
          );
        }
        throw signInErr;
      }

      const userId = data.user?.id;
      if (!userId) throw new Error("Sign in failed.");

      await assertVisitorPortalMember(userId);

      const token = data.session?.access_token;
      if (!token) throw new Error("Session missing.");

      const sendRes = await fetch("/api/fusion-xpress/send-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to send verification code.");
      }

      setStep("code");
      setCode("");
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

      const res = await fetch("/api/fusion-xpress/verify-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code, method: "email" }),
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

  const onResendCode = async () => {
    setResendCodeLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired.");
      const res = await fetch("/api/fusion-xpress/send-login-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to resend code.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResendCodeLoading(false);
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
      setError(err instanceof Error ? err.message : "Unable to send reset link.");
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
        {step === "code" ? "Verify your login" : "Sign in to your account"}
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        {step === "code"
          ? "Enter the 6-digit code we sent to your email."
          : "Sign in as your organization to manage guest check-ins, approvals, and QR passes."}
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
      {resetSent ? <p className="mt-4 text-sm text-primary-700">Password reset link sent.</p> : null}

      {step === "code" ? (
        <form className="mt-6 space-y-4" onSubmit={onVerifyCode}>
          <label className="block text-sm font-medium text-gray-700" htmlFor="visitor-code">
            Verification code
          </label>
          <input
            id="visitor-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full min-h-[52px] rounded-lg border border-gray-300 px-4 py-3 text-center text-lg font-mono tracking-[0.35em] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-xl"
            placeholder="000000"
          />
          <button
            type="submit"
            disabled={codeLoading || code.length !== 6}
            className={btnPrimary}
          >
            {codeLoading ? "Verifying…" : "Verify and continue"}
          </button>
          <button type="button" onClick={onResendCode} disabled={resendCodeLoading} className="text-sm font-semibold text-primary-700 hover:text-primary-900">
            {resendCodeLoading ? "Sending…" : "Resend code"}
          </button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <div className="relative mt-1">
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
          <div className="relative mt-1">
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
              onClick={onForgotPassword}
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
