"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ScanLine, XCircle } from "lucide-react";

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
    config: { fps: number; qrbox: number; aspectRatio: number },
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

export default function EmployeeKioskPage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setLocationReady(false);
    try {
      kioskDeviceIdRef.current = getOrCreateKioskDeviceId();
      await ensureKioskLocation();
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(SCANNER_DIV_ID) as unknown as QrScanner;
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: 260, aspectRatio: 1 },
        (text) => void submitToken(text),
        () => {}
      );
      setCameraActive(true);
    } catch (e: unknown) {
      setCameraError(
        e instanceof Error
          ? e.message
          : "Could not start camera. Allow camera and location for this site."
      );
      setCameraActive(false);
    }
  }, [submitToken, ensureKioskLocation]);

  const stopCamera = useCallback(async () => {
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
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading kiosk…</p>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link
          href={VISITOR_MANAGEMENT_EMPLOYEES_PATH}
          className="text-sm font-semibold text-primary-700 hover:underline"
        >
          ← Employees
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          <ScanLine className="w-7 h-7 text-primary-600" />
          Staff QR kiosk
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          One tablet at reception scans <strong>every</strong> employee&apos;s personal QR pass (staff
          and CRM). Each person holds their pass to the camera — they do not use their own phone here.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
        <div id={SCANNER_DIV_ID} className="w-full min-h-[280px]" />
        {!cameraActive ? (
          <div className="p-6 text-center space-y-2">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-bold text-white"
            >
              <ScanLine className="w-4 h-4" />
              Start camera
            </button>
            <p className="text-xs text-white/70">Allow camera and location when prompted.</p>
          </div>
        ) : (
          <div className="p-3 text-center space-y-1">
            {locationReady ? (
              <p className="text-xs text-emerald-300">Workplace GPS ready — scan any employee pass</p>
            ) : null}
            <button
              type="button"
              onClick={() => void stopCamera()}
              className="text-sm font-semibold text-white/80 hover:text-white"
            >
              Stop camera
            </button>
          </div>
        )}
      </div>

      {cameraError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {cameraError}
        </p>
      ) : null}

      {scanning ? (
        <p className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Recording attendance…
        </p>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-xl border p-5 flex gap-3 ${
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
  );
}
