"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LogIn, LogOut, XCircle } from "lucide-react";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  browserDeviceLabel,
  getOrCreateBrowserDeviceId,
} from "@/lib/employees/device-fingerprint";
import { receptionGateTitle } from "@/lib/employees/reception-gate";
import type { EmployeeMemberType } from "@/lib/employees/types";
import { formatEmployeeTimestamp } from "@/lib/employees/utils";

type EmployeePreview = {
  id: string;
  fullName: string;
  department: string;
  employeeCode?: string;
  attendanceStatus: "in" | "out";
  lastSignedInAt: string | null;
  lastSignedOutAt: string | null;
};

type PagePhase =
  | { kind: "loading" }
  | { kind: "ready"; employee: EmployeePreview }
  | {
      kind: "gate-bound";
      gateToken: string;
      memberType: EmployeeMemberType;
      employee: EmployeePreview;
    }
  | {
      kind: "gate-setup";
      gateToken: string;
      memberType: EmployeeMemberType;
      teamLabel: string;
    }
  | { kind: "error"; message: string }
  | {
      kind: "done";
      ok: boolean;
      eventType?: "sign_in" | "sign_out";
      employeeName?: string;
      occurredAt?: string;
      message: string;
      gateToken?: string;
    };

export default function EmployeeCheckPage() {
  const searchParams = useSearchParams();
  const gateToken = useMemo(() => searchParams?.get("gate")?.trim() ?? "", [searchParams]);
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);
  const isGateMode = Boolean(gateToken);

  const [phase, setPhase] = useState<PagePhase>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [memberCodeInput, setMemberCodeInput] = useState("");

  const loadPersonalPass = useCallback(async (qrToken: string) => {
    if (!qrToken) {
      setPhase({
        kind: "error",
        message: "Invalid employee QR link. Scan the reception QR or ask your manager for help.",
      });
      return;
    }

    setPhase({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/visitor-employees/lookup?token=${encodeURIComponent(qrToken)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        employee?: EmployeePreview;
        error?: string;
      };
      if (!res.ok) {
        setPhase({ kind: "error", message: json.error ?? "Could not load your pass." });
        return;
      }
      if (!json.employee) {
        setPhase({ kind: "error", message: "Employee not found." });
        return;
      }
      setPhase({ kind: "ready", employee: json.employee });
    } catch (e: unknown) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, []);

  const loadGateSession = useCallback(async (gate: string) => {
    if (!gate) {
      setPhase({ kind: "error", message: "Invalid reception QR. Ask your manager for a new poster." });
      return;
    }

    setPhase({ kind: "loading" });
    setMemberCodeInput("");
    try {
      const deviceId = getOrCreateBrowserDeviceId();
      const qs = new URLSearchParams({ gate });
      if (deviceId) qs.set("deviceId", deviceId);
      const res = await fetch(`/api/visitor-employees/roster?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        gate?: { memberType: EmployeeMemberType; teamLabel: string };
        boundEmployee?: EmployeePreview & { employeeCode: string };
        needsSetup?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setPhase({ kind: "error", message: json.error ?? "Could not open sign-in." });
        return;
      }
      const memberType = json.gate?.memberType ?? "staff";
      if (json.boundEmployee && !json.needsSetup) {
        setPhase({
          kind: "gate-bound",
          gateToken: gate,
          memberType,
          employee: json.boundEmployee,
        });
        return;
      }
      setPhase({
        kind: "gate-setup",
        gateToken: gate,
        memberType,
        teamLabel: json.gate?.teamLabel ?? memberType,
      });
    } catch (e: unknown) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, []);

  useEffect(() => {
    if (isGateMode) void loadGateSession(gateToken);
    else void loadPersonalPass(token);
  }, [isGateMode, gateToken, token, loadGateSession, loadPersonalPass]);

  const runScan = useCallback(
    async (
      action: "sign_in" | "sign_out",
      opts: { token?: string; gate?: string; employeeId?: string; memberCode?: string }
    ) => {
      setSubmitting(true);
      try {
        let latitude: number;
        let longitude: number;
        let accuracyMeters: number;
        try {
          const { getBrowserPosition } = await import("@/lib/employees/browser-geolocation");
          const pos = await getBrowserPosition();
          latitude = pos.latitude;
          longitude = pos.longitude;
          accuracyMeters = pos.accuracyMeters;
        } catch (e: unknown) {
          setPhase({
            kind: "done",
            ok: false,
            message:
              e instanceof Error
                ? e.message
                : "Location is required to sign in or out at your workplace.",
            gateToken: opts.gate,
          });
          return;
        }

        const deviceId = getOrCreateBrowserDeviceId();
        const body: Record<string, string | number> = {
          action,
          deviceId,
          deviceLabel: browserDeviceLabel(),
          latitude,
          longitude,
          accuracyMeters,
        };
        if (opts.gate) body.gate = opts.gate;
        if (opts.employeeId) body.employeeId = opts.employeeId;
        if (opts.memberCode) body.memberCode = opts.memberCode;
        if (opts.token) body.token = opts.token;

        const res = await fetch("/api/visitor-employees/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...body,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
            platform: typeof navigator !== "undefined" ? navigator.platform : "",
            language: typeof navigator !== "undefined" ? navigator.language : "",
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          eventType?: "sign_in" | "sign_out";
          occurredAt?: string;
          employee?: { fullName?: string };
          error?: string;
        };

        if (!res.ok) {
          setPhase({
            kind: "done",
            ok: false,
            message: json.error ?? "Could not record attendance.",
            gateToken: opts.gate,
          });
          return;
        }

        const signedIn = json.eventType === "sign_in";
        setPhase({
          kind: "done",
          ok: true,
          eventType: json.eventType,
          employeeName: json.employee?.fullName,
          occurredAt: json.occurredAt,
          gateToken: opts.gate,
          message: signedIn
            ? "You are signed in. Scan the reception QR again when you leave to sign out."
            : "You are signed out. See you next time.",
        });
      } catch (e: unknown) {
        setPhase({
          kind: "done",
          ok: false,
          message: e instanceof Error ? e.message : "Network error",
          gateToken: opts.gate,
        });
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const runPersonalAction = useCallback(
    (action: "sign_in" | "sign_out") => {
      if (!token) return;
      return runScan(action, { token });
    },
    [token, runScan]
  );

  const gateBound = phase.kind === "gate-bound" ? phase : null;
  const gateSetup = phase.kind === "gate-setup" ? phase : null;
  const ready = phase.kind === "ready" ? phase.employee : null;
  const done = phase.kind === "done" ? phase : null;
  const signedInDone = done?.eventType === "sign_in";

  const reload = () => {
    if (gateToken) void loadGateSession(gateToken);
    else if (token) void loadPersonalPass(token);
  };

  const handleMemberCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = memberCodeInput.trim();
    if (!code || !gateToken) return;
    void runScan("sign_in", { gate: gateToken, memberCode: code });
  };

  return (
    <main className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto max-w-md flex items-center justify-between gap-3">
          <Image src={BRAND_LOGO_URL} alt="Fusion Xpress" width={120} height={36} className="h-8 w-auto" />
          <Link
            href="/fusion-xpress/smart-visitor-management/sign-in"
            className="text-xs font-semibold text-primary-700 hover:underline"
          >
            Account sign in
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1 text-center">
            Employee attendance
          </p>
          {isGateMode ? (
            <h1 className="text-lg font-extrabold text-gray-900 text-center mb-4">
              {receptionGateTitle(
                gateBound?.memberType ?? gateSetup?.memberType ?? "staff"
              )}
            </h1>
          ) : (
            <p className="text-center text-sm text-gray-500 mb-4">Sign in or sign out</p>
          )}

          {phase.kind === "loading" || submitting ? (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
              <p className="text-sm font-medium">
                {submitting
                  ? "Checking your location…"
                  : isGateMode
                    ? "Opening sign-in…"
                    : "Loading your pass…"}
              </p>
            </div>
          ) : null}

          {phase.kind === "error" ? (
            <div className="py-4 space-y-3 text-center">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <p className="text-sm text-red-700">{phase.message}</p>
            </div>
          ) : null}

          {gateSetup ? (
            <form onSubmit={handleMemberCodeSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                <strong>First time on this phone:</strong> enter your unique member ID from your manager.
                Your phone will be linked so next time you only sign in or out — no name list.
              </p>
              <label className="block">
                <span className="text-xs font-semibold uppercase text-gray-600 tracking-wide">
                  Member ID
                </span>
                <input
                  type="text"
                  value={memberCodeInput}
                  onChange={(e) => setMemberCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. STF-A1B2C3"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-lg font-mono font-bold tracking-wider"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={submitting || !memberCodeInput.trim()}
                className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Link phone & sign in
              </button>
              <p className="text-[10px] text-gray-500 text-center">
                {gateSetup.teamLabel} team · do not use someone else&apos;s ID
              </p>
            </form>
          ) : null}

          {gateBound ? (
            <div className="py-2 space-y-4 text-center">
              <p className="text-lg font-bold text-gray-900">{gateBound.employee.fullName}</p>
              {gateBound.employee.employeeCode ? (
                <p className="text-xs font-mono text-gray-500">ID: {gateBound.employee.employeeCode}</p>
              ) : null}
              {gateBound.employee.department ? (
                <p className="text-sm text-gray-600">{gateBound.employee.department}</p>
              ) : null}
              {gateBound.employee.attendanceStatus === "in" ? (
                <>
                  <LogIn className="w-10 h-10 mx-auto text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">You are signed in</p>
                  {gateBound.employee.lastSignedInAt ? (
                    <p className="text-xs text-gray-500">
                      Since {formatEmployeeTimestamp(gateBound.employee.lastSignedInAt)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      void runScan("sign_out", {
                        gate: gateBound.gateToken,
                        employeeId: gateBound.employee.id,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <LogOut className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm text-gray-600">Tap to sign in</p>
                  <button
                    type="button"
                    onClick={() =>
                      void runScan("sign_in", {
                        gate: gateBound.gateToken,
                        employeeId: gateBound.employee.id,
                      })
                    }
                    className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          ) : null}

          {ready && phase.kind === "ready" ? (
            <div className="py-4 space-y-4 text-center">
              <p className="text-lg font-bold text-gray-900">{ready.fullName}</p>
              {ready.department ? (
                <p className="text-sm text-gray-600">{ready.department}</p>
              ) : null}
              {ready.attendanceStatus === "in" ? (
                <>
                  <LogIn className="w-10 h-10 mx-auto text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-800">You are signed in</p>
                  {ready.lastSignedInAt ? (
                    <p className="text-xs text-gray-500">
                      Since {formatEmployeeTimestamp(ready.lastSignedInAt)}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void runPersonalAction("sign_out")}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
                  >
                    Sign out now
                  </button>
                </>
              ) : (
                <>
                  <LogOut className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm text-gray-600">Tap to sign in for today</p>
                  <button
                    type="button"
                    onClick={() => void runPersonalAction("sign_in")}
                    className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          ) : null}

          {done ? (
            <div className="py-4 space-y-4 text-center">
              {done.ok ? (
                <>
                  {signedInDone ? (
                    <LogIn className="w-12 h-12 mx-auto text-emerald-600" />
                  ) : (
                    <LogOut className="w-12 h-12 mx-auto text-slate-600" />
                  )}
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 -mt-2" />
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {signedInDone ? "Signed in" : "Signed out"}
                  </h2>
                  {done.employeeName ? (
                    <p className="text-sm font-semibold text-gray-800">{done.employeeName}</p>
                  ) : null}
                  <p className="text-sm text-gray-600">{done.message}</p>
                  {done.occurredAt ? (
                    <p className="text-xs text-gray-500">{formatEmployeeTimestamp(done.occurredAt)}</p>
                  ) : null}
                  {done.gateToken ? (
                    <button
                      type="button"
                      onClick={reload}
                      className="text-sm font-semibold text-primary-700 hover:underline"
                    >
                      Continue
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 mx-auto text-red-500" />
                  <p className="text-sm text-red-700">{done.message}</p>
                  <button
                    type="button"
                    onClick={reload}
                    className="text-sm font-semibold text-primary-700 hover:underline"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          ) : null}

          <p className="mt-6 text-xs text-gray-500 text-center">
            {isGateMode
              ? "Your phone is linked to your member ID. Location must be on — sign-in/out only works at your registered workplace (Basic & Enterprise)."
              : "Turn on location to sign in or out at your workplace. Directors receive email when you sign in."}
          </p>
        </div>
      </div>
    </main>
  );
}
