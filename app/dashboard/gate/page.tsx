"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ScanLine, XCircle, Loader2, Camera, Keyboard } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type ScanResult = {
  valid: boolean;
  duplicate: boolean;
  name: string;
  ticketId: string;
  voteId?: string;
  checked_in_at?: string;
  message: string;
};

const SCANNER_DIV_ID = "gate-qr-scanner";

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

function parseRefFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const urlMatch = trimmed.match(/[/?]ref=([A-Za-z0-9._-]+)/);
  if (urlMatch) return urlMatch[1];
  return trimmed;
}

export default function DashboardGatePage() {
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();

  const [refInput, setRefInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const lastScannedAt = useRef<number>(0);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("reports")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  const submitRef = useCallback(
    async (ref: string) => {
      const parsed = parseRefFromInput(ref);
      if (!parsed) return;

      setScanning(true);
      setError(null);
      setResult(null);
      setCameraError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not logged in");

        const res = await fetch("/api/gate/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ref: parsed }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(json?.error ?? `Scan failed (${res.status})`);
          setResult(null);
          return;
        }

        setResult(json as ScanResult);
        setRefInput("");
        inputRef.current?.focus();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Scan failed");
        setResult(null);
      } finally {
        setScanning(false);
      }
    },
    []
  );

  const handleScan = () => submitRef(refInput);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScan();
  };

  const startCamera = useCallback(async () => {
    if (typeof window === "undefined") return;
    setCameraError(null);
    setRequestingCamera(true);
    setManualMode(false);
    setResult(null);
    setError(null);

    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    if (!nav.mediaDevices?.getUserMedia) {
      setCameraError("Camera not supported in this browser. Use Chrome or Safari.");
      setRequestingCamera(false);
      return;
    }

    // Request camera permission explicitly first so the browser shows the Allow/Block prompt
    let testStream: MediaStream | null = null;
    try {
      testStream = await nav.mediaDevices.getUserMedia({ video: true });
    } catch (permErr: unknown) {
      setRequestingCamera(false);
      const e = permErr instanceof Error ? permErr : new Error(String(permErr));
      const name = (e as Error & { name?: string }).name || "";
      let msg = e.message || "Camera access denied.";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || msg.toLowerCase().includes("permission"))
        msg = "Camera permission denied. Allow camera access for this site and try again.";
      else if (name === "NotFoundError") msg = "No camera found.";
      setCameraError(msg);
      return;
    } finally {
      if (testStream) testStream.getTracks().forEach((t) => t.stop());
    }
    setRequestingCamera(false);

    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (_) {}
      scannerRef.current.clear();
      scannerRef.current = null;
    }

    // Show scanner div first so the video element is visible when we request the camera (required on some browsers)
    setCameraActive(true);

    // Allow React to paint the visible div before starting the camera
    await new Promise((r) => setTimeout(r, 100));

    const element = document.getElementById(SCANNER_DIV_ID);
    if (!element) {
      setCameraError("Scanner element not found.");
      setCameraActive(false);
      return;
    }

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const config = {
        fps: 10,
        qrbox: 280,
        aspectRatio: 1,
      };

      const constraintsToTry: MediaTrackConstraints[] = [
        { facingMode: "environment" }, // back camera on phone
        { facingMode: "user" },       // front camera
        {},                           // default
      ];

      let started = false;
      let scanner: QrScanner | null = null;

      for (const constraints of constraintsToTry) {
        scanner = new Html5Qrcode(SCANNER_DIV_ID, { verbose: false }) as unknown as QrScanner;
        scannerRef.current = scanner;

        const onSuccess = (decodedText: string) => {
          const ref = parseRefFromInput(decodedText);
          if (!ref || ref.length < 6) return;
          const now = Date.now();
          if (lastScannedRef.current === ref && now - lastScannedAt.current < 3000) return;
          lastScannedRef.current = ref;
          lastScannedAt.current = now;

          scannerRef.current
            ?.stop()
            .then(() => {
              setCameraActive(false);
              if (scannerRef.current) {
                scannerRef.current.clear();
                scannerRef.current = null;
              }
              submitRef(ref);
            })
            .catch(() => {});
        };

        try {
          await scanner.start(constraints, config, onSuccess, () => {});
          started = true;
          break;
        } catch (_) {
          scanner.clear();
          scannerRef.current = null;
        }
      }

      if (!started) {
        throw new Error("Camera access failed. Allow camera permission and use HTTPS (or localhost).");
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      const name = err.name || "";
      let msg = err.message || "Could not start camera";
      if (name === "NotAllowedError" || msg.toLowerCase().includes("permission"))
        msg = "Camera permission denied. Allow camera access for this site and try again.";
      else if (name === "NotFoundError" || msg.toLowerCase().includes("not found"))
        msg = "No camera found. Connect a camera or use a device with a camera.";
      else if (name === "NotReadableError")
        msg = "Camera is in use by another app. Close other apps using the camera and try again.";
      setCameraError(msg);
      setCameraActive(false);
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          await scanner.stop();
        } catch (_) {}
        scanner.clear();
        scannerRef.current = null;
      }
    }
  }, [submitRef]);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (_) {}
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setCameraActive(false);
    setCameraError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return null;

  return (
    <div className="text-left max-w-2xl">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Gate – Scan receipt</h2>
        <p className="mt-1 text-gray-600 text-left">
          Scan the receipt QR with your phone camera. The system checks automatically—first scan = valid entry, duplicate = already used.
        </p>
      </div>

      {/* Scanner mount point: always in DOM so we can re-start camera after "Scan next" */}
      <div
        id={SCANNER_DIV_ID}
        className={cameraActive ? "mt-6 rounded-t-xl overflow-hidden bg-black min-h-[280px]" : "hidden"}
      />

      {/* Camera scanner UI */}
      <div className="mt-6">
        {!cameraActive ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <Camera className="w-10 h-10 text-primary-600" />
              </div>
              <p className="text-gray-700 font-medium">Scan with your phone camera</p>
              <p className="mt-1 text-sm text-gray-500">Point at the receipt QR code. No need to type anything.</p>
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                When you tap below, your browser will show an &quot;Allow camera&quot; prompt — tap <strong>Allow</strong> to continue.
              </p>
              <button
                type="button"
                onClick={startCamera}
                disabled={scanning || requestingCamera}
                className="mt-6 inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 text-lg"
              >
                {requestingCamera ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : scanning ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
                {requestingCamera ? "Requesting camera…" : scanning ? "Checking…" : "Start camera & scan"}
              </button>
              {cameraError && (
                <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-left">
                  <p className="text-sm font-medium text-amber-800">{cameraError}</p>
                  {cameraError.toLowerCase().includes("permission") && (
                    <div className="mt-3 text-xs text-amber-800 space-y-2">
                      <p className="font-medium">No prompt appeared? Camera is blocked for this website.</p>
                      <p><strong>Chrome on phone:</strong> Tap the <strong>lock icon</strong> or <strong>⋮</strong> (three dots) or <strong>i</strong> in the <strong>address bar at the top</strong> → <strong>Site settings</strong> → <strong>Camera</strong> → set to <strong>Allow</strong> → go back and <strong>reload this page</strong>, then tap &quot;Start camera & scan&quot; again.</p>
                      <p><strong>Chrome on desktop:</strong> Click the lock or camera icon in the address bar → Camera → Allow → reload.</p>
                      <p><strong>Safari (iPhone):</strong> Settings → Safari → Camera → Allow. Reload this page and try again.</p>
                      <p className="mt-2">Use <strong>HTTPS</strong> (not HTTP). Then tap &quot;Try again&quot; below.</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setCameraError(null); startCamera(); }}
                    className="mt-3 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!cameraError && (
                <p className="mt-3 text-xs text-gray-500">
                  Use HTTPS (required for camera). Allow camera when the browser asks.
                </p>
              )}
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Or enter reference manually
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-900 rounded-b-xl flex justify-between items-center">
            <span className="text-white text-sm">Point at receipt QR code</span>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-600"
            >
              Stop camera
            </button>
          </div>
        )}
      </div>

      {/* Manual entry (collapsible) */}
      {(manualMode || refInput) && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Enter reference manually</label>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={refInput}
              onChange={(e) => setRefInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste ref or receipt URL"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              disabled={scanning}
            />
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning || !refInput.trim()}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
              Check
            </button>
          </div>
          <button
            type="button"
            onClick={() => { setManualMode(false); setRefInput(""); }}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700"
          >
            Hide manual entry
          </button>
        </div>
      )}

      {!manualMode && !refInput && !cameraActive && (
        <p className="mt-4 text-sm text-gray-500">
          Open this page on your phone at <strong>Dashboard → Gate</strong>, tap &quot;Start camera & scan&quot;, then scan the attendee&apos;s receipt QR. Result appears automatically.
        </p>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-start gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div
          className={`mt-6 p-6 rounded-xl border-2 ${
            result.valid ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.valid ? (
              <CheckCircle2 className="w-10 h-10 text-green-600 flex-shrink-0" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600 flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className={`text-lg font-bold ${result.valid ? "text-green-800" : "text-red-800"}`}>
                {result.valid ? "Valid – Allow entry" : "Duplicate – Do not allow entry"}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">Name:</span> {result.name}
              </p>
              <p className="mt-1 text-sm text-gray-700 font-mono">
                <span className="font-medium">{result.voteId ? "Vote ID:" : "Ticket ID:"}</span>{" "}
                {result.voteId ?? result.ticketId}
              </p>
              {result.duplicate && result.checked_in_at && (
                <p className="mt-2 text-sm text-red-700">
                  First used: {new Date(result.checked_in_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={startCamera}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700"
          >
            <Camera className="w-4 h-4" />
            Scan next
          </button>
        </div>
      )}

      <div className="mt-6">
        <Link href="/dashboard" className="text-primary-600 hover:underline font-medium">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
