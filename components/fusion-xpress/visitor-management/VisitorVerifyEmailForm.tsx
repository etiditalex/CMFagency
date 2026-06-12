"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const inputClass =
  "mt-1.5 w-full min-h-[48px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 sm:text-sm";

export default function VisitorVerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/visitor-management/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Verification failed");
      setMessage("Email verified. Sign in with your password — you will set up Google Authenticator on first login.");
      setTimeout(() => {
        router.push("/fusion-xpress/smart-visitor-management/sign-in");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/visitor-management/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; alreadyVerified?: boolean };
      if (!res.ok) throw new Error(json.error ?? "Could not resend code");
      if (json.alreadyVerified) {
        setMessage("This email is already verified. You can sign in.");
      } else {
        setMessage("A new verification code was sent to your email.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mt-5 sm:mt-6">
      <h1 className="text-xl font-extrabold text-gray-900 sm:text-2xl">Verify your email</h1>
      <p className="mt-2 text-sm text-gray-600">
        We sent a 6-digit code to your inbox after sign-up. Enter it below, then sign in with your password
        and set up Google Authenticator.
      </p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <form onSubmit={onVerify} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Email *</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Verification code *</span>
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={`${inputClass} font-mono tracking-[0.3em]`}
            placeholder="000000"
            autoComplete="one-time-code"
          />
        </label>
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-secondary-400 px-4 py-3 text-sm font-bold text-gray-900 hover:bg-secondary-300 disabled:opacity-60"
        >
          {loading ? "Verifying…" : "Verify email"}
        </button>
      </form>

      <button
        type="button"
        onClick={onResend}
        disabled={resending}
        className="mt-4 text-sm font-semibold text-primary-700 hover:text-primary-900"
      >
        {resending ? "Sending…" : "Resend verification code"}
      </button>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already verified?{" "}
        <Link href="/fusion-xpress/smart-visitor-management/sign-in" className="font-semibold text-primary-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
