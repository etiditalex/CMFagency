"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { supabase } from "@/lib/supabase";

type TotpSecurityPanelProps = {
  disabled?: boolean;
};

/** Self-service Google Authenticator (TOTP) setup for the signed-in admin. */
export default function TotpSecurityPanel({ disabled }: TotpSecurityPanelProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [required, setRequired] = useState(false);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadStatus = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    const res = await fetch("/api/fusion-xpress/2fa/method", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      hasTotp?: boolean;
      totpRequired?: boolean;
    };
    setEnabled(!!json.hasTotp);
    setRequired(!!json.totpRequired);
  }, [getToken]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setError(null);
    setSuccess(null);
    setSetupLoading(true);
    setSetupUrl(null);
    setSecret(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/fusion-xpress/2fa/totp/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        otpauthUrl?: string;
        secret?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Setup failed");
      setSetupUrl(json.otpauthUrl ?? null);
      setSecret(json.secret ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start setup");
    } finally {
      setSetupLoading(false);
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const digits = code.trim().replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your app");
      return;
    }
    setConfirmLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/fusion-xpress/2fa/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: digits }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Verification failed");
      setEnabled(true);
      setSetupUrl(null);
      setSecret(null);
      setCode("");
      setSuccess("Google Authenticator enabled. Use it at your next sign-in.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setConfirmLoading(false);
    }
  };

  const disable = async () => {
    if (!window.confirm("Disable Google Authenticator? You will use email codes only at login.")) {
      return;
    }
    setError(null);
    setSuccess(null);
    setDisableLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/fusion-xpress/2fa/totp/disable", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to disable");
      setEnabled(false);
      setSuccess("Google Authenticator disabled.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to disable");
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary-600" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-gray-900">Google Authenticator (2FA)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {required
              ? "Required for business accounts when signing in."
              : "Add a 6-digit app code at sign-in for extra account security."}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {error ? (
          <p className="text-sm text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-800 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            {success}
          </p>
        ) : null}

        {enabled === null ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : setupUrl ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">
              Scan with your authenticator app, then enter the code below.
            </p>
            <div className="flex flex-wrap items-start gap-6">
              <div className="bg-white p-3 rounded-lg border border-gray-200 inline-block">
                <QRCodeSVG value={setupUrl} size={168} level="M" />
              </div>
              {secret ? (
                <div className="text-sm text-gray-600">
                  <p className="font-medium text-gray-700">Or enter manually:</p>
                  <code className="mt-1 block break-all font-mono text-xs bg-gray-100 p-2 rounded">{secret}</code>
                </div>
              ) : null}
            </div>
            <form onSubmit={confirmSetup} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg font-mono tracking-widest text-sm"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={confirmLoading || code.replace(/\D/g, "").length !== 6}
                className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
              >
                {confirmLoading ? "Verifying…" : "Verify and enable"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetupUrl(null);
                  setSecret(null);
                  setCode("");
                  setError(null);
                }}
                className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </form>
          </div>
        ) : enabled ? (
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Smartphone className="w-5 h-5" />
              Google Authenticator is enabled
            </span>
            {!required ? (
              <button
                type="button"
                onClick={() => void disable()}
                disabled={disableLoading}
                className="inline-flex items-center gap-1 rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {disableLoading ? "Disabling…" : "Disable"}
              </button>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void startSetup()}
            disabled={disabled || setupLoading}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
          >
            <Smartphone className="w-4 h-4" />
            {setupLoading ? "Starting…" : "Enable Google Authenticator"}
          </button>
        )}
      </div>
    </section>
  );
}
