"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Fingerprint,
  Loader2,
  MapPin,
  QrCode,
  XCircle,
} from "lucide-react";

import FingerprintPad from "@/components/fusion-xpress/visitor-management/employees/FingerprintPad";
import {
  BIOMETRIC_FINGERS,
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
import {
  buildKioskCameraStartAttempts,
  buildKioskScannerRuntimeConfig,
  defaultKioskCameraFacing,
  formatKioskCameraStartError,
  useNativeBarcodeDetectorOnDevice,
  type KioskCameraFacing,
} from "@/lib/qr-scanner/kiosk-scanner-config";

type Feedback = {
  ok: boolean;
  title: string;
  detail: string;
};

type CheckMode = "fingerprint" | "qr";

interface QrScanner {
  start(
    cameraIdOrConfig: string | MediaTrackConstraints,
    config: {
      fps: number;
      qrbox?:
        | number
        | { width: number; height: number }
        | ((viewfinderWidth: number, viewfinderHeight: number) => {
            width: number;
            height: number;
          });
      aspectRatio?: number;
      disableFlip?: boolean;
      videoConstraints?: MediaTrackConstraints;
    },
    onSuccess: (decodedText: string) => void,
    onError: () => void
  ): Promise<null>;
  stop(): Promise<void>;
  clear(): void;
}

const EMP_TOKEN_PATTERN = /FX-EMP-[A-Za-z0-9-]+/;
const SCANNER_DIV_ID = "biometric-terminal-qr-scanner";

function parseEmployeeToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get("token")?.trim();
      if (fromQuery) return fromQuery;
    }
  } catch {
    /* fall through */
  }
  const urlMatch = trimmed.match(/[?&]token=([^&#]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).trim();
  const tokenMatch = trimmed.match(EMP_TOKEN_PATTERN);
  if (tokenMatch) return tokenMatch[0];
  if (trimmed.startsWith("FX-EMP-")) return trimmed.split(/\s/)[0] ?? trimmed;
  return "";
}

function BiometricCheckInner() {
  const searchParams = useSearchParams();
  const terminalToken = parseBiometricTerminalToken(
    searchParams?.get("terminal") ?? searchParams?.get("terminalToken")
  );

  const [mode, setMode] = useState<CheckMode>("fingerprint");
  const [businessName, setBusinessName] = useState("");
  const [terminalName, setTerminalName] = useState("Fingerprint terminal");
  const [loadingTerminal, setLoadingTerminal] = useState(true);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [fingerIndex, setFingerIndex] = useState(1);
  const [showRegister, setShowRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [locationReady, setLocationReady] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [hasLocalCreds, setHasLocalCreds] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing] = useState<KioskCameraFacing>(() =>
    typeof window !== "undefined" ? defaultKioskCameraFacing() : "environment"
  );

  const positionRef = useRef<BrowserPosition | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedAt = useRef(0);

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
        setTerminalName(json.terminal?.name ?? "Attendance terminal");
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

  const postQrScan = useCallback(
    async (token: string) => {
      const pos = await ensureTerminalLocation();
      const res = await fetch("/api/visitor-employees/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "toggle",
          scanSource: "kiosk",
          kioskScan: true,
          deviceId: getOrCreateBiometricDeviceId(),
          deviceLabel: `${browserDeviceLabel()} · terminal QR`,
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
        occurredAt?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "QR scan failed");
      return json;
    },
    [ensureTerminalLocation]
  );

  const applyScanFeedback = useCallback(
    (json: {
      eventType?: string;
      employee?: { fullName?: string };
      fingerLabel?: string;
      occurredAt?: string;
      firstEnrollment?: boolean;
    },
    source: "fingerprint" | "qr") => {
      const signedIn = json.eventType === "sign_in";
      const enrolledNote = json.firstEnrollment
        ? " · Fingerprint registered — next time you only need your finger"
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
        detail: `${json.employee?.fullName ?? "Employee"}${
          source === "fingerprint" && json.fingerLabel ? ` · ${json.fingerLabel}` : " · QR"
        } · ${
          json.occurredAt ? new Date(json.occurredAt).toLocaleTimeString() : "now"
        }${enrolledNote}`,
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
      applyScanFeedback(json, "fingerprint");
    } catch (e: unknown) {
      setFeedback({
        ok: false,
        title: "Fingerprint sign-in failed",
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
        fingerIndex,
        ...(externalId ? { externalId } : {}),
      });
      applyScanFeedback(json, "fingerprint");
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
    fingerIndex,
    webauthnSupported,
    postBiometricScan,
    applyScanFeedback,
  ]);

  const stopQrScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraActive(false);
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      /* ignore */
    }
    try {
      scanner.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const handleQrDecoded = useCallback(
    async (raw: string) => {
      const token = parseEmployeeToken(raw);
      if (!token) {
        const now = Date.now();
        if (lastScannedRef.current !== raw || now - lastScannedAt.current >= 4000) {
          lastScannedRef.current = raw;
          lastScannedAt.current = now;
          setFeedback({
            ok: false,
            title: "Unrecognized QR",
            detail: "Show the employee QR pass from the Employees screen.",
          });
        }
        return;
      }

      const now = Date.now();
      if (lastScannedRef.current === token && now - lastScannedAt.current < 4000) return;
      lastScannedRef.current = token;
      lastScannedAt.current = now;

      setBusy(true);
      setFeedback(null);
      try {
        const json = await postQrScan(token);
        applyScanFeedback(json, "qr");
      } catch (e: unknown) {
        setFeedback({
          ok: false,
          title: "QR scan failed",
          detail: e instanceof Error ? e.message : "Could not record attendance",
        });
      } finally {
        setBusy(false);
      }
    },
    [postQrScan, applyScanFeedback]
  );

  const startQrScanner = useCallback(async () => {
    setCameraError(null);
    setFeedback(null);
    try {
      await ensureTerminalLocation();
    } catch (e: unknown) {
      setFeedback({
        ok: false,
        title: "Location required",
        detail: e instanceof Error ? e.message : "Allow location first.",
      });
      return;
    }

    await stopQrScanner();
    setCameraActive(true);

    try {
      await new Promise((r) => window.setTimeout(r, 50));
      const element = document.getElementById(SCANNER_DIV_ID);
      if (!element) {
        throw new Error("Scanner is still loading. Wait a moment and try again.");
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const { config } = buildKioskScannerRuntimeConfig(element, { facing: cameraFacing });
      const attempts = await buildKioskCameraStartAttempts(cameraFacing);
      const useNativeBarcodeDetector = useNativeBarcodeDetectorOnDevice();

      let started = false;
      let lastError: unknown = null;

      for (const cameraIdOrConstraints of attempts) {
        const scanner = new Html5Qrcode(SCANNER_DIV_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: useNativeBarcodeDetector,
        }) as unknown as QrScanner;
        scannerRef.current = scanner;

        try {
          await scanner.start(
            cameraIdOrConstraints,
            config,
            (decoded) => {
              void handleQrDecoded(decoded);
            },
            () => {}
          );
          started = true;
          break;
        } catch (err) {
          lastError = err;
          try {
            await scanner.stop();
          } catch {
            /* ignore */
          }
          try {
            scanner.clear();
          } catch {
            /* ignore */
          }
          scannerRef.current = null;
        }
      }

      if (!started) {
        throw new Error(formatKioskCameraStartError(lastError, cameraFacing));
      }
    } catch (e: unknown) {
      setCameraActive(false);
      setCameraError(e instanceof Error ? e.message : formatKioskCameraStartError(e, cameraFacing));
    }
  }, [ensureTerminalLocation, stopQrScanner, cameraFacing, handleQrDecoded]);

  useEffect(() => {
    if (mode !== "qr") {
      void stopQrScanner();
    }
  }, [mode, stopQrScanner]);

  useEffect(() => {
    return () => {
      void stopQrScanner();
    };
  }, [stopQrScanner]);

  if (loadingTerminal) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading attendance terminal…
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
            {mode === "fingerprint" ? (
              <Fingerprint className="h-7 w-7" />
            ) : (
              <QrCode className="h-7 w-7" />
            )}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-sky-800">
            {businessName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-gray-900">{terminalName}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Same attendance as QR — choose fingerprint or scan your staff QR pass.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("fingerprint")}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-bold ${
              mode === "fingerprint"
                ? "bg-white text-sky-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Fingerprint className="h-4 w-4" />
            Fingerprint
          </button>
          <button
            type="button"
            onClick={() => setMode("qr")}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-bold ${
              mode === "qr"
                ? "bg-white text-sky-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="h-4 w-4" />
            QR code
          </button>
        </div>

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

          {mode === "fingerprint" ? (
            <>
              <p className="text-sm text-gray-600">
                {hasLocalCreds
                  ? "Place your enrolled finger — no member ID needed."
                  : "First time on this terminal: register once with your member ID. After that, fingerprint only."}
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
                Sign in with fingerprint
              </button>

              {!webauthnSupported ? (
                <p className="text-xs text-amber-800">
                  This browser cannot use device fingerprint. Use a phone/tablet with fingerprint,
                  Face ID, or Windows Hello — or use the QR tab.
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
                  <div className="flex justify-center py-1">
                    <FingerprintPad
                      key={padKey}
                      mode="enroll"
                      disabled={busy || !memberCode.trim() || !locationReady}
                      onComplete={() => void runFirstTimeRegister()}
                      label={BIOMETRIC_FINGERS.find((f) => f.index === fingerIndex)?.label}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-500">
                    Hold on the pad to capture, then confirm with your device fingerprint.
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Scan the same employee QR pass used elsewhere — attendance is recorded the same way.
              </p>
              {!cameraActive ? (
                <button
                  type="button"
                  disabled={busy || !locationReady}
                  onClick={() => void startQrScanner()}
                  className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3 text-base font-bold text-white hover:bg-sky-800 disabled:opacity-50"
                >
                  <QrCode className="h-5 w-5" />
                  Start QR camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void stopQrScanner()}
                  className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700"
                >
                  Stop camera
                </button>
              )}
              {cameraError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {cameraError}
                </p>
              ) : null}
              <div
                id={SCANNER_DIV_ID}
                className={`overflow-hidden rounded-xl bg-black ${cameraActive ? "min-h-[240px]" : "hidden"}`}
              />
            </>
          )}

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
