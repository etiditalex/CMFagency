"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Search, XCircle } from "lucide-react";

import FingerprintPad from "@/components/fusion-xpress/visitor-management/employees/FingerprintPad";
import {
  BIOMETRIC_NOT_REGISTERED_MESSAGE,
  DEFAULT_BIOMETRIC_FINGER_LABEL,
  getOrCreateBiometricDeviceId,
  parseBiometricTerminalToken,
} from "@/lib/employees/biometric";
import type { BrowserPosition } from "@/lib/employees/browser-geolocation";
import { browserDeviceLabel } from "@/lib/employees/device-fingerprint";
import {
  authenticateEmployeeWebAuthn,
  isPlatformWebAuthnAvailable,
} from "@/lib/employees/webauthn-browser";

type Feedback = {
  ok: boolean;
  title: string;
  detail: string;
  eventType?: "sign_in" | "sign_out";
};

type DirectoryHit = {
  id: string;
  fullName: string;
  employeeCode: string | null;
  department: string;
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
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [locationReady, setLocationReady] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [webauthnSupported, setWebauthnSupported] = useState(false);
  const [query, setQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hits, setHits] = useState<DirectoryHit[]>([]);
  const [selected, setSelected] = useState<DirectoryHit | null>(null);
  const positionRef = useRef<BrowserPosition | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedbackSoon = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
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

  const searchEmployees = useCallback(async () => {
    if (!terminalToken) return;
    const q = query.trim();
    if (q.length < 2) {
      setSearchError("Enter at least two characters of the member ID or name.");
      setHits([]);
      return;
    }
    setSearchBusy(true);
    setSearchError(null);
    setSelected(null);
    try {
      const res = await fetch(
        `/api/visitor-employees/biometric/directory?terminal=${encodeURIComponent(terminalToken)}&q=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        employees?: DirectoryHit[];
      };
      if (!res.ok) throw new Error(json.error ?? "Could not search employees");
      const next = json.employees ?? [];
      setHits(next);
      if (next.length === 0) {
        setSearchError("No matching employee. Check the member ID or name, or ask an administrator to enroll you.");
      }
    } catch (e: unknown) {
      setHits([]);
      setSearchError(e instanceof Error ? e.message : "Could not search employees");
    } finally {
      setSearchBusy(false);
    }
  }, [query, terminalToken]);

  const applyScanFeedback = useCallback(
    (json: {
      eventType?: string;
      employee?: { fullName?: string; attendanceStatus?: string };
      fingerLabel?: string;
      occurredAt?: string;
    }) => {
      const signedIn = json.eventType === "sign_in";
      const signedOut = json.eventType === "sign_out";
      const timeLabel = json.occurredAt
        ? new Date(json.occurredAt).toLocaleTimeString()
        : "now";
      setFeedback({
        ok: true,
        title: signedOut ? "Signed out" : signedIn ? "Signed in" : "Attendance recorded",
        detail: `${json.employee?.fullName ?? "Employee"} · ${
          signedOut ? "Sign out" : signedIn ? "Sign in" : "Scan"
        } · ${json.fingerLabel ?? DEFAULT_BIOMETRIC_FINGER_LABEL} · ${timeLabel}`,
        eventType: signedOut ? "sign_out" : signedIn ? "sign_in" : undefined,
      });
      clearFeedbackSoon();
    },
    [clearFeedbackSoon]
  );

  const runThumbScan = useCallback(async () => {
    if (!terminalToken || busy || !locationReady || !selected) return;
    setBusy(true);
    setFeedback(null);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    try {
      const pos = await ensureTerminalLocation();
      const optRes = await fetch("/api/visitor-employees/biometric/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal: terminalToken,
          employeeId: selected.id,
        }),
      });
      const optJson = (await optRes.json().catch(() => ({}))) as {
        error?: string;
        options?: Parameters<typeof authenticateEmployeeWebAuthn>[0];
      };
      if (!optRes.ok || !optJson.options) {
        throw new Error(optJson.error ?? BIOMETRIC_NOT_REGISTERED_MESSAGE);
      }

      const assertion = await authenticateEmployeeWebAuthn(optJson.options);
      const res = await fetch("/api/visitor-employees/biometric/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal: terminalToken,
          employeeId: selected.id,
          assertion,
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
      };
      if (!res.ok) throw new Error(json.error ?? "Fingerprint scan failed");
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
      clearFeedbackSoon();
    } finally {
      setBusy(false);
      setPadKey((k) => k + 1);
    }
  }, [
    terminalToken,
    busy,
    locationReady,
    selected,
    ensureTerminalLocation,
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

  const thumbReady = locationReady && webauthnSupported && !!selected && !busy;

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
            Search your member ID or name, confirm it is you, then place your{" "}
            <span className="font-semibold text-white">right thumb</span> to sign in or sign out.
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

        <form
          className="mt-5 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void searchEmployees();
          }}
        >
          <label className="block text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            Member ID or name
          </label>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchError(null);
              }}
              placeholder="e.g. FX-001 or Jane"
              autoComplete="off"
              className="min-h-[44px] flex-1 rounded-xl border border-white/15 bg-slate-900 px-3 text-sm text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={searchBusy || !terminalToken}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-sky-700 px-4 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-50"
            >
              {searchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find
            </button>
          </div>
        </form>

        {searchError ? (
          <p className="mt-2 text-center text-xs text-amber-200/90">{searchError}</p>
        ) : null}

        {hits.length > 0 && !selected ? (
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/80 p-2">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(hit);
                    setFeedback(null);
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/10"
                >
                  <span className="font-semibold text-white">{hit.fullName}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {[hit.employeeCode, hit.department].filter(Boolean).join(" · ") || "Staff"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {selected ? (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3 py-2.5">
            <div>
              <p className="text-sm font-bold text-emerald-50">{selected.fullName}</p>
              <p className="text-xs text-emerald-200/80">
                {[selected.employeeCode, selected.department].filter(Boolean).join(" · ") || "Confirmed"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPadKey((k) => k + 1);
              }}
              className="text-xs font-semibold text-emerald-100 underline"
            >
              Change
            </button>
          </div>
        ) : null}

        <section className="mt-6 flex flex-1 flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 px-4 py-8 shadow-2xl">
          <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-sky-300">
            {busy
              ? "Reading thumb…"
              : !selected
                ? "Confirm who you are"
                : thumbReady
                  ? "Right thumb ready"
                  : "Waiting for GPS…"}
          </p>

          <FingerprintPad
            key={`scan-${padKey}`}
            mode="verify"
            tone="dark"
            disabled={!thumbReady}
            onComplete={() => void runThumbScan()}
            label={DEFAULT_BIOMETRIC_FINGER_LABEL}
          />

          <p className="mt-5 max-w-sm text-center text-sm text-slate-300">
            {selected
              ? "Hold your right thumb on the sensor. If the phone offers PIN or password, cancel and use fingerprint only."
              : "Not registered yet? Contact your administrator to add you to the attendance register on this terminal."}
          </p>

          {!webauthnSupported ? (
            <p className="mt-3 max-w-sm text-center text-xs text-amber-200">
              This device cannot use fingerprint. Use a tablet or phone with a fingerprint sensor,
              kept at reception.
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
