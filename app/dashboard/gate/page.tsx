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
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
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
    setManualMode(false);
    setResult(null);
    setError(null);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const element = document.getElementById(SCANNER_DIV_ID);
      if (!element) {
        setCameraError("Scanner element not found.");
        return;
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (_) {}
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(SCANNER_DIV_ID, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (w, h) => Math.min(280, w, h),
          aspectRatio: 1,
        },
        (decodedText) => {
          const ref = parseRefFromInput(decodedText);
          if (!ref || ref.length < 6) return;
          const now = Date.now();
          if (lastScannedRef.current === ref && now - lastScannedAt.current < 3000) return;
          lastScannedRef.current = ref;
          lastScannedAt.current = now;

          scanner
            .stop()
            .then(() => {
              setCameraActive(false);
              scannerRef.current = null;
              scanner.clear();
              submitRef(ref);
            })
            .catch(() => {});
        },
        () => {}
      );
      setCameraActive(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start camera";
      setCameraError(msg);
      setCameraActive(false);
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (_) {}
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
              <button
                type="button"
                onClick={startCamera}
                disabled={scanning}
                className="mt-6 inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 text-lg"
              >
                {scanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                {scanning ? "Checking…" : "Start camera & scan"}
              </button>
              {cameraError && (
                <p className="mt-4 text-sm text-red-600">{cameraError}</p>
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
