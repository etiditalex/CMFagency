"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ScanLine, SwitchCamera, XCircle, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  browserDeviceLabel,
  getOrCreateKioskDeviceId,
} from "@/lib/employees/device-fingerprint";
import type { BrowserPosition } from "@/lib/employees/browser-geolocation";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import type { EmployeeMemberType } from "@/lib/employees/types";
import { VISITOR_MANAGEMENT_EMPLOYEES_PATH } from "@/lib/visitors/industry-options";

const SCANNER_DIV_ID = "employee-kiosk-qr-scanner";

interface QrScanner {
  start(
    cameraIdOrConfig: string | MediaTrackConstraints,
    config: {
      fps: number;
      qrbox?: number | { width: number; height: number };
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

function parseEmployeeToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/[?&]token=([^&]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).trim();
  const tokenMatch = trimmed.match(EMP_TOKEN_PATTERN);
  if (tokenMatch) return tokenMatch[0];
  return trimmed.slice(0, 128);
}

type ScanFeedback = {
  ok: boolean;
  title: string;
  detail: string;
};

type CameraFacing = "environment" | "user";

export default function EmployeeKioskPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [cameraActive, setCameraActive] = useState(false);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("environment");
  const [locationReady, setLocationReady] = useState(false);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedAt = useRef<number>(0);
  const kioskPositionRef = useRef<BrowserPosition | null>(null);
  const kioskDeviceIdRef = useRef<string>("");

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress/smart-visitor-management/sign-in");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
    }
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  const ensureKioskLocation = useCallback(async (): Promise<BrowserPosition> => {
    if (kioskPositionRef.current) return kioskPositionRef.current;
    const { getBrowserPosition } = await import("@/lib/employees/browser-geolocation");
    const pos = await getBrowserPosition({
      timeoutMs: 25000,
      maximumAge: 120_000,
    });
    kioskPositionRef.current = pos;
    setLocationReady(true);
    return pos;
  }, []);

  const submitToken = useCallback(
    async (raw: string) => {
      const token = parseEmployeeToken(raw);
      if (!token) return;

      const now = Date.now();
      if (lastScannedRef.current === token && now - lastScannedAt.current < 4000) return;
      lastScannedRef.current = token;
      lastScannedAt.current = now;

      setScanning(true);
      setFeedback(null);
      setCameraError(null);

      try {
        let pos: BrowserPosition;
        try {
          pos = await ensureKioskLocation();
        } catch (e: unknown) {
          setFeedback({
            ok: false,
            title: "Scan failed",
            detail:
              e instanceof Error
                ? e.message
                : "Allow location for this site on the kiosk device, then tap Start camera again.",
          });
          return;
        }

        if (!kioskDeviceIdRef.current) {
          kioskDeviceIdRef.current = getOrCreateKioskDeviceId();
        }

        const res = await fetch("/api/visitor-employees/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "toggle",
            scanSource: "kiosk",
            kioskScan: true,
            deviceId: kioskDeviceIdRef.current,
            deviceLabel: `Reception kiosk · ${browserDeviceLabel()}`,
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracyMeters: pos.accuracyMeters,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            platform: typeof navigator !== "undefined" ? navigator.platform : "",
            language: typeof navigator !== "undefined" ? navigator.language : "",
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          eventType?: string;
          employee?: { fullName?: string; memberType?: EmployeeMemberType };
          error?: string;
        };

        if (!res.ok) {
          setFeedback({
            ok: false,
            title: "Scan failed",
            detail: json.error ?? `Error ${res.status}`,
          });
          return;
        }

        const name = json.employee?.fullName ?? "Employee";
        const team =
          json.employee?.memberType === "crm" || json.employee?.memberType === "staff"
            ? memberTypeLabel(json.employee.memberType)
            : null;
        const signedIn = json.eventType === "sign_in";
        setFeedback({
          ok: true,
          title: signedIn ? "Signed in" : "Signed out",
          detail: team
            ? `${name} (${team}) — ${signedIn ? "Welcome" : "Goodbye"}`
            : `${name} — ${signedIn ? "Welcome" : "Goodbye"}`,
        });
      } catch (e: unknown) {
        setFeedback({
          ok: false,
          title: "Network error",
          detail: e instanceof Error ? e.message : "Could not record attendance",
        });
      } finally {
        setScanning(false);
      }
    },
    [ensureKioskLocation]
  );

  const stopScannerStream = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* ignore */
      }
    }
  }, []);

  const launchScanner = useCallback(
    async (facing: CameraFacing) => {
      const element = document.getElementById(SCANNER_DIV_ID);
      if (!element) throw new Error("Scanner element not found.");

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const viewH = element.clientHeight || Math.floor(vh * 0.75);
      const scanSize = Math.floor(Math.min(vw, viewH) * 0.78);
      const qrbox = Math.max(240, Math.min(scanSize, 400));
      const config = {
        fps: 20,
        qrbox: { width: qrbox, height: qrbox },
        aspectRatio: 1,
        disableFlip: false,
        videoConstraints: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } as MediaTrackConstraints,
      };

      const constraintsToTry: MediaTrackConstraints[] =
        facing === "environment"
          ? [
              { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
              { facingMode: "environment" },
            ]
          : [
              { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
              { facingMode: "user" },
            ];

      let started = false;
      for (const constraints of constraintsToTry) {
        const scanner = new Html5Qrcode(SCANNER_DIV_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          useBarCodeDetectorIfSupported: true,
        }) as unknown as QrScanner;
        scannerRef.current = scanner;

        try {
          await scanner.start(constraints, config, (text) => void submitToken(text), () => {});
          started = true;
          setCameraFacing(facing);
          break;
        } catch {
          scanner.clear();
          scannerRef.current = null;
        }
      }

      if (!started) {
        throw new Error(
          facing === "environment"
            ? "Could not open back camera. Try switching to front camera."
            : "Could not open front camera. Try switching to back camera."
        );
      }
    },
    [submitToken]
  );

  const startCamera = useCallback(async () => {
    if (typeof window === "undefined") return;
    setCameraError(null);
    setRequestingCamera(true);
    setLocationReady(false);

    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    if (!nav.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported in this browser. Use Chrome or Safari.");
      setRequestingCamera(false);
      return;
    }

    if (!window.isSecureContext) {
      setCameraError("Camera only works on HTTPS.");
      setRequestingCamera(false);
      return;
    }

    try {
      kioskDeviceIdRef.current = getOrCreateKioskDeviceId();
      await ensureKioskLocation();
    } catch (e: unknown) {
      setCameraError(
        e instanceof Error
          ? e.message
          : "Allow location for this site on the kiosk device, then try again."
      );
      setRequestingCamera(false);
      return;
    }

    if (scannerRef.current) {
      await stopScannerStream();
    }

    setCameraActive(true);
    setCameraFacing("environment");
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      await launchScanner("environment");
      setRequestingCamera(false);
    } catch (e: unknown) {
      setRequestingCamera(false);
      setCameraError(
        e instanceof Error
          ? e.message
          : "Could not start camera. Allow camera and location for this site."
      );
      setCameraActive(false);
      await stopScannerStream();
    }
  }, [ensureKioskLocation, launchScanner, stopScannerStream]);

  const flipCamera = useCallback(async () => {
    if (!cameraActive || requestingCamera) return;
    const nextFacing: CameraFacing = cameraFacing === "environment" ? "user" : "environment";
    setRequestingCamera(true);
    setCameraError(null);
    try {
      await stopScannerStream();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await launchScanner(nextFacing);
    } catch (e: unknown) {
      setCameraError(e instanceof Error ? e.message : "Could not switch camera.");
      try {
        await launchScanner(cameraFacing);
      } catch {
        setCameraActive(false);
      }
    } finally {
      setRequestingCamera(false);
    }
  }, [cameraActive, cameraFacing, launchScanner, requestingCamera, stopScannerStream]);

  const stopCamera = useCallback(async () => {
    await stopScannerStream();
    setCameraActive(false);
  }, [stopScannerStream]);

  useEffect(() => {
    if (!cameraActive) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading kiosk…</p>;
  }

  return (
    <>
      <div
        className={
          cameraActive
            ? "fixed inset-0 z-[100] flex flex-col bg-black h-[100dvh] max-h-[100dvh] w-full"
            : "hidden"
        }
        aria-hidden={!cameraActive}
        role="dialog"
        aria-modal={cameraActive}
        aria-label="Employee QR scanner"
      >
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 py-3 bg-black/60 backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top))]">
          <p className="text-sm font-medium text-white min-w-0 truncate">
            {cameraFacing === "environment" ? "Back camera" : "Front camera"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void flipCamera()}
              disabled={requestingCamera}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-50"
              aria-label={cameraFacing === "environment" ? "Switch to front camera" : "Switch to back camera"}
            >
              {requestingCamera ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SwitchCamera className="w-4 h-4" />
              )}
              Flip
            </button>
            <button
              type="button"
              onClick={() => void stopCamera()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        <div
          id={SCANNER_DIV_ID}
          className="employee-kiosk-scanner-fullscreen relative flex-1 min-h-0 w-full"
        />

        <div className="relative z-10 shrink-0 space-y-2 px-4 py-4 bg-black/60 backdrop-blur-sm pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-center text-xs text-white/75">Align the QR pass within the frame</p>
          {locationReady ? (
            <p className="text-center text-xs text-emerald-300">GPS ready</p>
          ) : null}
          {scanning ? (
            <p className="flex items-center justify-center gap-2 text-sm text-white/90">
              <Loader2 className="w-4 h-4 animate-spin" />
              Recording attendance…
            </p>
          ) : null}
          {feedback ? (
            <div
              className={`rounded-lg border p-3 flex gap-2 ${
                feedback.ok
                  ? "border-emerald-400/40 bg-emerald-950/80 text-emerald-100"
                  : "border-red-400/40 bg-red-950/80 text-red-100"
              }`}
            >
              {feedback.ok ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 shrink-0 text-red-400" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm">{feedback.title}</p>
                <p className="text-xs mt-0.5">{feedback.detail}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`-mx-4 -mb-4 sm:-mx-6 sm:-mb-6 md:-mx-8 md:-mb-8 flex flex-col min-h-[calc(100dvh-5.5rem)] sm:min-h-[calc(100dvh-8rem)] max-w-none sm:max-w-2xl sm:mx-auto w-[calc(100%+2rem)] sm:w-full ${cameraActive ? "invisible h-0 overflow-hidden" : ""}`}
      >
      <div className="shrink-0 px-4 sm:px-0 pb-2 sm:pb-4">
        <Link
          href={VISITOR_MANAGEMENT_EMPLOYEES_PATH}
          className="text-sm font-semibold text-primary-700 hover:underline"
        >
          ← Employees
        </Link>
        <h1 className="mt-1 sm:mt-2 text-lg sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <ScanLine className="w-6 h-6 sm:w-7 sm:h-7 text-primary-600 shrink-0" />
          Staff QR kiosk
        </h1>
        <p className="hidden sm:block mt-2 text-sm text-gray-600">
          One tablet at reception scans every employee&apos;s personal QR pass (staff and CRM).
        </p>
      </div>

      <div className="relative flex-1 flex flex-col min-h-0 rounded-none sm:rounded-xl border-y sm:border border-gray-200 bg-gray-900 overflow-hidden min-h-[280px] sm:min-h-[360px]">
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-900">
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={requestingCamera}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-60 w-full max-w-xs justify-center"
            >
              {requestingCamera ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ScanLine className="w-5 h-5" />
              )}
              {requestingCamera ? "Starting camera…" : "Start camera"}
            </button>
            <p className="mt-3 text-xs text-white/70 max-w-xs">
              Allow camera and location. Then scan any staff or CRM pass.
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 sm:px-0 pt-3 sm:pt-4 space-y-3">
        {cameraError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {cameraError}
          </p>
        ) : null}

        {!cameraActive && feedback ? (
          <div
            className={`rounded-xl border p-4 sm:p-5 flex gap-3 ${
              feedback.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="w-8 h-8 shrink-0 text-red-600" />
            )}
            <div>
              <p className="font-bold text-lg">{feedback.title}</p>
              <p className="text-sm mt-1">{feedback.detail}</p>
            </div>
          </div>
        ) : null}
      </div>
      </div>
    </>
  );
}
