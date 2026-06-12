"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Smartphone } from "lucide-react";

import { supabase } from "@/lib/supabase";

type Props = {
  redirectTo: string;
  title?: string;
  description?: string;
};

export default function BusinessTotpSetupForm({
  redirectTo,
  title = "Set up Google Authenticator",
  description = "Business accounts must link Google Authenticator (or any TOTP app) before using the dashboard. Scan the QR code, then enter the 6-digit code to finish.",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  const startSetup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");

      const res = await fetch("/api/fusion-xpress/2fa/totp/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        otpauthUrl?: string;
        secret?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not start authenticator setup");
      setOtpauthUrl(json.otpauthUrl ?? null);
      setSecret(json.secret ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void startSetup();
  }, [startSetup]);

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirming(true);
    setError(null);
    try {
      const digits = code.trim().replace(/\D/g, "").slice(0, 6);
      if (digits.length !== 6) throw new Error("Enter the 6-digit code from your app");

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired. Sign in again.");

      const res = await fetch("/api/fusion-xpress/2fa/totp/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code: digits, completeLogin: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Invalid code");

      router.replace(redirectTo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2 text-primary-800">
        <Shield className="h-5 w-5" aria-hidden />
        <h1 className="text-xl font-extrabold text-gray-900 sm:text-2xl">{title}</h1>
      </div>
      <p className="mt-3 text-sm text-gray-600">{description}</p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-gray-500">Preparing your QR code…</p>
      ) : otpauthUrl ? (
        <div className="mt-6 space-y-5">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Install Google Authenticator on your phone (if you have not already).</li>
            <li>Tap <strong>Add account</strong> and scan the QR code below.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <div className="flex flex-wrap items-start gap-6">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <QRCodeSVG value={otpauthUrl} size={200} level="M" />
            </div>
            {secret ? (
              <div className="min-w-[200px] flex-1 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Manual entry key</p>
                <code className="mt-2 block break-all rounded bg-gray-100 p-2 font-mono text-xs">{secret}</code>
              </div>
            ) : null}
          </div>
          <form onSubmit={onConfirm} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700" htmlFor="totp-code">
              Verification code
            </label>
            <input
              id="totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-lg tracking-[0.35em] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="000000"
            />
            <button
              type="submit"
              disabled={confirming || code.replace(/\D/g, "").length !== 6}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              <Smartphone className="h-4 w-4" aria-hidden />
              {confirming ? "Verifying…" : "Verify and continue"}
            </button>
          </form>
          <button
            type="button"
            onClick={() => void startSetup()}
            className="text-sm font-semibold text-primary-700 hover:underline"
          >
            Generate a new QR code
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void startSetup()}
          className="mt-6 text-sm font-semibold text-primary-700 hover:underline"
        >
          Retry setup
        </button>
      )}
    </div>
  );
}
