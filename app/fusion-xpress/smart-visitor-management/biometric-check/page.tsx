"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Fingerprint, Loader2, MapPin, XCircle } from "lucide-react";

import FingerprintPad from "@/components/fusion-xpress/visitor-management/employees/FingerprintPad";
import {
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
          deviceLabel: `${browserDeviceLabel()} · biometric`,
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
        employee?: { fullName?: string };
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
        ? " · Fingerprint registered — next time you only need your right thumb"
        : "";
      const timeLabel = json.occurredAt
        ? new Date(json.occurredAt).toLocaleTimeString()
        : "now";
      setFeedback({
        ok: true,
        title: json.firstEnrollment
          ? signedIn
            ? "Fingerprint registered · Signed in"
            : "Fingerprint registered · Signed out"
          : signedOut
            ? "Signed out"
            : signedIn
              ? "Signed in"
              : "Attendance recorded",
        detail: `${json.employee?.fullName ?? "Employee"} · ${
          signedOut ? "Sign out" : signedIn ? "Sign in" : "Scan"
        } · ${json.fingerLabel ?? "Right thumb"} · ${timeLabel}${enrolledNote}`,
        eventType: signedOut ? "sign_out" : signedIn ? "sign_in" : undefined,
      });
    },
    []
  );

  const runFingerprintSignIn = useCallback(async () => {
    if (!terminalToken || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const externalId = await assertEmployeeWebAuthnCredential();
      setHasLocalCreds(true);
      const json = await postBiometricScan({ externalId });
      applyScanFeedback(json);
    } catch (e: unknown) {
      setFeedback({
        ok: false,
        title: "Fingerprint scan failed",
        detail:
          e instanceof Error
            ? e.message
            : "Use “First-time register” once with your member ID, then try again.",
      });
      if (!showRegister) setShowRegister(true);
    } finally {
      setBusy(false);
      setPadKey((k) => k + 1);
    }
  }, [terminalToken, busy, postBiometricScan, applyScanFeedback, showRegister]);

  const runFirstTimeRegister = useCallback(async () => {
    if (!terminalToken || busy) return;
    const code = memberCode.trim();
    if (!code) {
      setFeedback({
        ok: false,
        title: "Member ID required",
        detail: "Enter your staff or CRM member ID once to link your fingerprint.",
      });
      return;
    }

    setBusy(true);
    setFeedback(null);
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
      setFeedback({
        ok: false,
        title: "Registration failed",
        detail: e instanceof Error ? e.message : "Could not register fingerprint",
      });
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
  ]);

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
            Allow location when prompted. First time: register with your member ID and right thumb
            once. After that, sign in with your right thumb only.
          </p>
        </header>

        <div className="space-y-4 rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            {locationLoading ? (
              <p className="flex items-center gap-2 text-sky-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for location permission…
              </p>
            ) : locationReady ? (
              <p className="flex items-center gap-2 font-semibold text-emerald-700">
                <MapPin className="h-4 w-4" />
                GPS ready
              </p>
            ) : (
              <div className="space-y-2">
                <p className="flex items-start gap-2 text-amber-900">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {locationError ??
                      "Location is required for attendance. Allow location for this site."}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    positionRef.current = null;
                    void ensureTerminalLocation().catch(() => {});
                  }}
                  className="inline-flex min-h-[40px] items-center rounded-lg bg-sky-700 px-3 py-2 text-xs font-bold text-white hover:bg-sky-800"
                >
                  Allow location
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600">
            {hasLocalCreds
              ? "Use your right thumb — no member ID needed."
              : "First time on this terminal: register once with your member ID and right thumb. After that, fingerprint only."}
          </p>

          <button
            type="button"
            disabled={busy || !locationReady || !webauthnSupported}
            onClick={() => void runFingerprintSignIn()}
            className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-base font-bold text-white hover:bg-sky-800 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Fingerprint className="h-5 w-5" />
            )}
            Sign in / sign out with fingerprint
          </button>

          {!webauthnSupported ? (
            <p className="text-xs text-amber-800">
              This browser cannot use device fingerprint. Use a phone/tablet with fingerprint, Face
              ID, or Windows Hello. For QR attendance, use the separate Employees → Kiosk scanner.
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => setShowRegister((v) => !v)}
            className="text-sm font-semibold text-sky-800 hover:underline"
          >
            {showRegister ? "Hide first-time register" : "First-time register (member ID once)"}
          </button>

          {showRegister ? (
            <div className="space-y-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-4">
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
              <p className="text-sm text-gray-600">
                Use your <span className="font-semibold text-gray-800">right thumb</span> only.
              </p>
              <div className="flex justify-center py-1">
                <FingerprintPad
                  key={padKey}
                  mode="enroll"
                  disabled={busy || !memberCode.trim() || !locationReady}
                  onComplete={() => void runFirstTimeRegister()}
                  label={DEFAULT_BIOMETRIC_FINGER_LABEL}
                />
              </div>
              <p className="text-center text-xs text-gray-500">
                Hold your right thumb on the pad, then confirm with your device fingerprint.
              </p>
            </div>
          ) : null}

          {busy ? (
            <p className="flex items-center justify-center gap-2 text-sm text-sky-800">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording attendance…
            </p>
          ) : null}

          {feedback ? (
            <div
              className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${
                !feedback.ok
                  ? "border-red-200 bg-red-50 text-red-900"
                  : feedback.eventType === "sign_out"
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900"
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
