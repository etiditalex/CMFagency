"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ScanLine, XCircle, Loader2 } from "lucide-react";

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
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) router.replace("/fusion-xpress");
    if (!hasFeature("reports")) router.replace("/dashboard");
  }, [authLoading, portalLoading, isAuthenticated, isPortalMember, hasFeature, router, user]);

  const handleScan = async () => {
    const ref = parseRefFromInput(refInput);
    if (!ref) {
      setError("Enter or scan a receipt reference.");
      setResult(null);
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not logged in");

      const res = await fetch("/api/gate/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ref }),
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScan();
  };

  if (authLoading || portalLoading) return null;
  if (!isAuthenticated || !user || !isPortalMember || !hasFeature("reports")) return null;

  return (
    <div className="text-left">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 text-left">Gate – Scan receipt</h2>
        <p className="mt-1 text-gray-600 text-left max-w-2xl">
          Scan the receipt QR or enter the reference. First scan = valid entry; duplicate scan = already used (do not allow).
        </p>
      </div>

      <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6 max-w-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">Receipt reference</label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan QR or paste reference (e.g. cmf_...)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            autoFocus
            disabled={scanning}
          />
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning || !refInput.trim()}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />}
            {scanning ? "Checking…" : "Scan"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Paste the receipt link or the reference only. Handheld scanners that act as keyboard will work here.
        </p>
      </div>

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
