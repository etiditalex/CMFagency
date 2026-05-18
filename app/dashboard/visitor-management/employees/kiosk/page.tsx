"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ScanLine, XCircle } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import {
  browserDeviceLabel,
  getOrCreateBrowserDeviceId,
} from "@/lib/employees/device-fingerprint";
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
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedAt = useRef<number>(0);

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

  const submitToken = useCallback(async (raw: string) => {
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
      const deviceId = getOrCreateBrowserDeviceId();
      const res = await fetch("/api/visitor-employees/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "toggle",
          deviceId,
          deviceLabel: `Kiosk · ${browserDeviceLabel()}`,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
          platform: typeof navigator !== "undefined" ? navigator.platform : "",
          language: typeof navigator !== "undefined" ? navigator.language : "",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        eventType?: string;
        employee?: { fullName?: string };
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

      const name = json.employee?.fullName ?? "Staff member";
      const signedIn = json.eventType === "sign_in";
      setFeedback({
        ok: true,
        title: signedIn ? "Signed in" : "Signed out",
        detail: `${name} — ${signedIn ? "Welcome to work" : "Have a good evening"}`,
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
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
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
      setCameraError(e instanceof Error ? e.message : "Could not start camera");
      setCameraActive(false);
    }
  }, [submitToken]);

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
        <p className="mt-1 text-sm text-gray-600">
          Point the camera at an employee QR pass. Each scan records the device and toggles sign-in
          or sign-out. Directors are emailed automatically.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
        <div id={SCANNER_DIV_ID} className="w-full min-h-[280px]" />
        {!cameraActive ? (
          <div className="p-6 text-center">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-3 text-sm font-bold text-white"
            >
              <ScanLine className="w-4 h-4" />
              Start camera
            </button>
          </div>
        ) : (
          <div className="p-3 text-center">
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
