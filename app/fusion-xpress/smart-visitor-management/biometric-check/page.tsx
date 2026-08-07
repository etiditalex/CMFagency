"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Fingerprint, Loader2, MapPin, XCircle } from "lucide-react";

import FingerprintPad from "@/components/fusion-xpress/visitor-management/employees/FingerprintPad";
import {
  BIOMETRIC_NOT_REGISTERED_MESSAGE,
  DEFAULT_BIOMETRIC_FINGER_INDEX,
  DEFAULT_BIOMETRIC_FINGER_LABEL,
  getOrCreateBiometricDeviceId,
  parseBiometricTerminalToken,
} from "@/lib/employees/biometric";
import type { BrowserPosition } from "@/lib/employees/browser-geolocation";
import { browserDeviceLabel } from "@/lib/employees/device-fingerprint";
import {
  assertEmployeeWebAuthnCredential,
  createEmployeeWebAuthnCredential,
  isPlatformWebAuthnAvailable,
  listLocalWebAuthnCredentialIds,
} from "@/lib/employees/webauthn-browser";

type Feedback = {
  ok: boolean;
  title: string;
  detail: string;
  eventType?: "sign_in" | "sign_out";
};

const FEEDBACK_CLEAR_MS = 4500;

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
  const [showRegister, setShowRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [locationReady, setLocationReady] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [hasLocalCreds, setHasLocalCreds] = useState(false);
  const positionRef = useRef<BrowserPosition | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackSoon = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      setPadKey((k) => k + 1);
    }, FEEDBACK_CLEAR_MS);
  }, []);

  const ensureTerminalLocation = useCallback(async (): Promise<BrowserPosition> => {
    if (positionRef.current) return positionRef.current;
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { getBrowserPosition } = await import("@/lib/employees/browser-geolocation");
      const pos = await getBrowserPosition({
        timeoutMs: 25000,
        maximumAge: 120_000,
      });
      positionRef.current = pos;
      setLocationReady(true);
      return pos;
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Allow location for this site on the terminal device, then try again.";
      setLocationError(message);
      setLocationReady(false);
      throw e instanceof Error ? e : new Error(message);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    setWebauthnSupported(isPlatformWebAuthnAvailable());
    setHasLocalCreds(listLocalWebAuthnCredentialIds().length > 0);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (loadingTerminal || terminalError || !terminalToken) return;
    void ensureTerminalLocation().catch(() => {});
  }, [loadingTerminal, terminalError, terminalToken, ensureTerminalLocation]);

  const postBiometricScan = useCallback(
    async (body: Record<string, unknown>) => {
      const pos = await ensureTerminalLocation();
      const res = await fetch("/api/visitor-employees/biometric/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...body,
          terminal: terminalToken,
          action: "toggle",
          deviceId: getOrCreateBiometricDeviceId(),
          deviceLabel: `${browserDeviceLabel()} · biometric terminal`,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracyMeters: pos.accuracyMeters,
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
      return json;
    },
    [ensureTerminalLocation, terminalToken]
  );

  const applyScanFeedback = useCallback(
    (json: {
      eventType?: string;
      employee?: { fullName?: string; attendanceStatus?: string };
      fingerLabel?: string;
      occurredAt?: string;
      firstEnrollment?: boolean;
    }) => {
      const signedIn = json.eventType === "sign_in";
      const signedOut = json.eventType === "sign_out";
      const enrolledNote = json.firstEnrollment
        ? " · Right thumb registered on this terminal"
        : "";
      const timeLabel = json.occurredAt
        ? new Date(json.occurredAt).toLocaleTimeString()
        : "now";
      setFeedback({
        ok: true,
        title: json.firstEnrollment
          ? signedIn
            ? "Registered · Signed in"
            : "Registered · Signed out"
          : signedOut
            ? "Signed out"
            : signedIn
              ? "Signed in"
              : "Attendance recorded",
        detail: `${json.employee?.fullName ?? "Employee"} · ${
          signedOut ? "Sign out" : signedIn ? "Sign in" : "Scan"
        } · ${json.fingerLabel ?? DEFAULT_BIOMETRIC_FINGER_LABEL} · ${timeLabel}${enrolledNote}`,
        eventType: signedOut ? "sign_out" : signedIn ? "sign_in" : undefined,
      });
      clearFeedbackSoon();
    },
    [clearFeedbackSoon]
  );

  /** Shared terminal: place right thumb on the pad → identify → sign in/out. */
  const runThumbScan = useCallback(async () => {
    if (!terminalToken || busy || !locationReady) return;
    setBusy(true);
    setFeedback(null);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    try {
      const externalId = await assertEmployeeWebAuthnCredential();
      setHasLocalCreds(true);
      const json = await postBiometricScan({ externalId });
      applyScanFeedback(json);
    } catch (e: unknown) {
      const detail =
        e instanceof Error && e.message.trim()
          ? e.message
          : BIOMETRIC_NOT_REGISTERED_MESSAGE;
      const notRegistered =
        detail.includes("not yet registered") ||
        detail.includes(BIOMETRIC_NOT_REGISTERED_MESSAGE);
      setFeedback({
        ok: false,
        title: notRegistered ? "Not registered" : "Fingerprint not recognised",
        detail: notRegistered ? BIOMETRIC_NOT_REGISTERED_MESSAGE : detail,
      });
      // Only open register for device/cancel errors — unknown staff must contact admin.
      if (!notRegistered) setShowRegister(true);
      clearFeedbackSoon();
    } finally {
      setBusy(false);
      setPadKey((k) => k + 1);
    }
  }, [
    terminalToken,
    busy,
    locationReady,
    postBiometricScan,
    applyScanFeedback,
    clearFeedbackSoon,
  ]);

  const runFirstTimeRegister = useCallback(async () => {
    if (!terminalToken || busy) return;
    const code = memberCode.trim();
    if (!code) {
      setFeedback({
        ok: false,
        title: "Member ID required",
        detail: "Enter your staff or CRM member ID once to link your right thumb on this terminal.",
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    try {
      let externalId: string | undefined;
      if (webauthnSupported) {
        externalId = await createEmployeeWebAuthnCredential({
          employeeId: code,
          memberCode: code,
          displayName: code,
        });
        setHasLocalCreds(true);
      }

      const json = await postBiometricScan({
        memberCode: code,
        fingerIndex: DEFAULT_BIOMETRIC_FINGER_INDEX,
        ...(externalId ? { externalId } : {}),
      });
      applyScanFeedback(json);
      setMemberCode("");
      setShowRegister(false);
    } catch (e: unknown) {
      const detail =
        e instanceof Error && e.message.trim()
          ? e.message
          : "Could not register fingerprint";
      const notRegistered =
        detail.includes("not yet registered") ||
        detail.includes(BIOMETRIC_NOT_REGISTERED_MESSAGE);
      setFeedback({
        ok: false,
        title: notRegistered ? "Not registered" : "Registration failed",
        detail: notRegistered ? BIOMETRIC_NOT_REGISTERED_MESSAGE : detail,
      });
      clearFeedbackSoon();
    } finally {
      setBusy(false);
      setPadKey((k) => k + 1);
    }
  }, [
    terminalToken,
    busy,
    memberCode,
    webauthnSupported,
    postBiometricScan,
    applyScanFeedback,
    clearFeedbackSoon,
  ]);

  if (loadingTerminal) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-sm text-slate-200">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Opening fingerprint terminal…
      </div>
    );
  }

  if (terminalError) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 text-center">
        <div>
          <XCircle className="mx-auto h-10 w-10 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-white">Terminal unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">{terminalError}</p>
        </div>
      </div>
    );
  }

  const thumbReady = locationReady && webauthnSupported && !busy;

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 py-6 sm:py-8">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
            {businessName}
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {terminalName}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Shared terminal on site — place your <span className="font-semibold text-white">right thumb</span>{" "}
            to sign in or sign out.
          </p>
        </header>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold">
          {locationLoading ? (
            <span className="inline-flex items-center gap-1.5 text-sky-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Confirming workplace location…
            </span>
          ) : locationReady ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <MapPin className="h-3.5 w-3.5" />
              On premise · GPS ready
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                positionRef.current = null;
                void ensureTerminalLocation().catch(() => {});
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 text-amber-200"
            >
              <MapPin className="h-3.5 w-3.5" />
              Allow location (required at workplace)
            </button>
          )}
        </div>

        {!locationReady && locationError ? (
          <p className="mt-3 text-center text-xs text-amber-200/90">{locationError}</p>
        ) : null}

        <section className="mt-6 flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-8 shadow-2xl">
          <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-sky-300">
            {busy ? "Reading thumb…" : thumbReady ? "Right thumb ready" : "Waiting for GPS…"}
          </p>

          <FingerprintPad
            key={`scan-${padKey}`}
            mode="verify"
            tone="dark"
            disabled={!thumbReady}
            onComplete={() => void runThumbScan()}
            label={DEFAULT_BIOMETRIC_FINGER_LABEL}
          />

          <p className="mt-5 max-w-xs text-center text-sm text-slate-300">
            {hasLocalCreds
              ? "Hold your right thumb on the pad — fingerprint only, no screen password."
              : "New on this terminal? Register once below with fingerprint (not PIN/password), then use the pad every day."}
          </p>

          {!webauthnSupported ? (
            <p className="mt-3 max-w-sm text-center text-xs text-amber-200">
              This device cannot use fingerprint. Use a tablet/phone with fingerprint, Face ID, or
              Windows Hello, kept at reception.
            </p>
          ) : null}

          {busy ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-sky-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording attendance…
            </p>
          ) : null}

          {feedback ? (
            <div
              className={`mt-5 w-full max-w-sm flex gap-3 rounded-2xl border px-4 py-3 text-sm ${
                !feedback.ok
                  ? "border-red-400/40 bg-red-950/80 text-red-100"
                  : feedback.eventType === "sign_out"
                    ? "border-amber-400/40 bg-amber-950/80 text-amber-50"
                    : "border-emerald-400/40 bg-emerald-950/80 text-emerald-50"
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
        </section>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => setShowRegister((v) => !v)}
            className="w-full text-center text-sm font-semibold text-sky-300 hover:text-sky-200"
          >
            {showRegister ? "Hide first-time register" : "First-time register (member ID once)"}
          </button>

          {showRegister ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-300">
                Link your right thumb to this reception terminal once. When the device asks, use
                fingerprint — not the phone or screen password. After that, only the pad is needed.
              </p>
              <label className="block text-sm">
                <span className="font-semibold text-slate-100">Member ID</span>
                <input
                  value={memberCode}
                  onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
                  placeholder="e.g. STF-123456"
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-3 text-base tracking-wide text-white"
                  disabled={busy}
                />
              </label>
              <div className="flex justify-center py-1">
                <FingerprintPad
                  key={`enroll-${padKey}`}
                  mode="enroll"
                  tone="dark"
                  disabled={busy || !memberCode.trim() || !locationReady}
                  onComplete={() => void runFirstTimeRegister()}
                  label={DEFAULT_BIOMETRIC_FINGER_LABEL}
                />
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
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-sm text-slate-200">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      }
    >
      <BiometricCheckInner />
    </Suspense>
  );
}
