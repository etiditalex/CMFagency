"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Fingerprint, Loader2, XCircle } from "lucide-react";

import FingerprintPad from "@/components/fusion-xpress/visitor-management/employees/FingerprintPad";
import {
  BIOMETRIC_FINGERS,
  getOrCreateBiometricDeviceId,
  parseBiometricTerminalToken,
} from "@/lib/employees/biometric";
import { browserDeviceLabel } from "@/lib/employees/device-fingerprint";

type Feedback = {
  ok: boolean;
  title: string;
  detail: string;
};

function BiometricCheckInner() {
  const searchParams = useSearchParams();
  const terminalToken = parseBiometricTerminalToken(
    searchParams?.get("terminal") ?? searchParams?.get("terminalToken")
  );

  const [businessName, setBusinessName] = useState("");
  const [terminalName, setTerminalName] = useState("Fingerprint terminal");
  const [loadingTerminal, setLoadingTerminal] = useState(true);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [fingerIndex, setFingerIndex] = useState(1);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [padKey, setPadKey] = useState(0);

  useEffect(() => {
    if (!terminalToken) {
      setLoadingTerminal(false);
      setTerminalError("Open this page from your organisation biometric terminal link.");
      return;
    }

    void (async () => {
      setLoadingTerminal(true);
      setTerminalError(null);
      try {
        const res = await fetch(
          `/api/visitor-employees/biometric/terminal-lookup?terminal=${encodeURIComponent(terminalToken)}`,
          { cache: "no-store" }
        );
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          businessName?: string;
          terminal?: { name?: string };
        };
        if (!res.ok) throw new Error(json.error ?? "Terminal not found");
        setBusinessName(json.businessName ?? "Organisation");
        setTerminalName(json.terminal?.name ?? "Fingerprint terminal");
      } catch (e: unknown) {
        setTerminalError(e instanceof Error ? e.message : "Could not load terminal");
      } finally {
        setLoadingTerminal(false);
      }
    })();
  }, [terminalToken]);

  const runScan = useCallback(async () => {
    if (!terminalToken || busy) return;
    const code = memberCode.trim();
    if (!code) {
      setFeedback({
        ok: false,
        title: "Member ID required",
        detail: "Enter your staff or CRM member ID, then place your finger on the pad.",
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/visitor-employees/biometric/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal: terminalToken,
          memberCode: code,
          fingerIndex,
          action: "toggle",
          deviceId: getOrCreateBiometricDeviceId(),
          deviceLabel: `${browserDeviceLabel()} · biometric`,
          platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
          language: typeof navigator !== "undefined" ? navigator.language : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        eventType?: string;
        employee?: { fullName?: string; attendanceStatus?: string };
        fingerLabel?: string;
        occurredAt?: string;
        firstEnrollment?: boolean;
      };
      if (!res.ok) throw new Error(json.error ?? "Fingerprint scan failed");

      const signedIn = json.eventType === "sign_in";
      const enrolledNote = json.firstEnrollment
        ? ` · ${json.fingerLabel ?? "Fingerprint"} registered for next time`
        : "";
      setFeedback({
        ok: true,
        title: json.firstEnrollment
          ? signedIn
            ? "Fingerprint registered · Signed in"
            : "Fingerprint registered · Signed out"
          : signedIn
            ? "Signed in"
            : "Signed out",
        detail: `${json.employee?.fullName ?? "Employee"} · ${json.fingerLabel ?? "Fingerprint"} · ${
          json.occurredAt ? new Date(json.occurredAt).toLocaleTimeString() : "now"
        }${enrolledNote}`,
      });
      setMemberCode("");
      setPadKey((k) => k + 1);
    } catch (e: unknown) {
      setFeedback({
        ok: false,
        title: "Scan failed",
        detail: e instanceof Error ? e.message : "Could not record attendance",
      });
      setPadKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }, [terminalToken, busy, memberCode, fingerIndex]);

  if (loadingTerminal) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading fingerprint terminal…
      </div>
    );
  }

  if (terminalError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-bold text-gray-900">Terminal unavailable</h1>
        <p className="mt-2 text-sm text-gray-600">{terminalError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-sky-50 via-white to-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-800">
            <Fingerprint className="h-7 w-7" />
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-800">
            {businessName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">{terminalName}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your member ID, choose a finger, then hold on the pad. The first scan registers
            that finger; later scans sign you in or out.
          </p>
        </header>

        <div className="space-y-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm">
          <label className="block text-sm">
            <span className="font-semibold text-gray-800">Member ID</span>
            <input
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
              placeholder="e.g. STF-123456"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base tracking-wide"
              disabled={busy}
            />
          </label>

          <label className="block text-sm">
            <span className="font-semibold text-gray-800">Finger</span>
            <select
              value={fingerIndex}
              onChange={(e) => {
                setFingerIndex(Number(e.target.value));
                setPadKey((k) => k + 1);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-base"
              disabled={busy}
            >
              {BIOMETRIC_FINGERS.map((f) => (
                <option key={f.index} value={f.index}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-center py-2">
            <FingerprintPad
              key={padKey}
              mode="verify"
              disabled={busy || !memberCode.trim()}
              onComplete={() => void runScan()}
              label={BIOMETRIC_FINGERS.find((f) => f.index === fingerIndex)?.label}
            />
          </div>

          {busy ? (
            <p className="flex items-center justify-center gap-2 text-sm text-sky-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording attendance…
            </p>
          ) : null}

          {feedback ? (
            <div
              className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
                feedback.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div>
                <p className="font-bold">{feedback.title}</p>
                <p className="mt-0.5 opacity-90">{feedback.detail}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function BiometricCheckPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      }
    >
      <BiometricCheckInner />
    </Suspense>
  );
}
