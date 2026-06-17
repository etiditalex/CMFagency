"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn, XCircle } from "lucide-react";

import VisitorCheckInConfirmation from "@/components/fusion-xpress/visitor-management/VisitorCheckInConfirmation";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { buildEmployeeCheckInSession } from "@/lib/employees/build-check-in-session";
import {
  browserDeviceLabel,
  getOrCreateBrowserDeviceId,
} from "@/lib/employees/device-fingerprint";
import { receptionGateTitle } from "@/lib/employees/reception-gate";
import type { EmployeeMemberType } from "@/lib/employees/types";
import {
  formatCheckInClock,
  formatCheckInDateLabel,
} from "@/lib/visitors/format-check-in-display";

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
      teamLabel: string;
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
      employee?: EmployeePreview;
      occurredAt?: string;
      message: string;
      gateToken?: string;
      memberType?: EmployeeMemberType;
      teamLabel?: string;
    };

function venueNameForGate(memberType: EmployeeMemberType, teamLabel?: string) {
  const title = receptionGateTitle(memberType).replace(/\s*—\s*sign in$/i, "").trim();
  return teamLabel?.trim() || title || "Workplace";
}

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
      const teamLabel = json.gate?.teamLabel ?? memberType;
      if (json.boundEmployee && !json.needsSetup) {
        setPhase({
          kind: "gate-bound",
          gateToken: gate,
          memberType,
          teamLabel,
          employee: json.boundEmployee,
        });
        return;
      }
      setPhase({
        kind: "gate-setup",
        gateToken: gate,
        memberType,
        teamLabel,
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
      opts: {
        token?: string;
        gate?: string;
        employeeId?: string;
        memberCode?: string;
        memberType?: EmployeeMemberType;
        teamLabel?: string;
      }
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
          employee?: EmployeePreview;
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

        setPhase({
          kind: "done",
          ok: true,
          eventType: json.eventType,
          employee: json.employee,
          occurredAt: json.occurredAt,
          gateToken: opts.gate,
          memberType: opts.memberType,
          teamLabel: opts.teamLabel,
          message:
            json.eventType === "sign_in"
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

  const reload = () => {
    if (gateToken) void loadGateSession(gateToken);
    else if (token) void loadPersonalPass(token);
  };

  const handleMemberCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = memberCodeInput.trim();
    if (!code || !gateToken) return;
    void runScan("sign_in", { gate: gateToken, memberCode: code, memberType: gateSetup?.memberType, teamLabel: gateSetup?.teamLabel });
  };

  const activeEmployee = useMemo(() => {
    if (done?.ok && done.employee) return done.employee;
    if (gateBound) return gateBound.employee;
    if (ready) return ready;
    return null;
  }, [done, gateBound, ready]);

  const confirmationView = useMemo(() => {
    if (!activeEmployee) return null;

    const gateContext = gateBound ?? (done?.gateToken ? { gateToken: done.gateToken, memberType: done.memberType ?? "staff", teamLabel: done.teamLabel ?? "" } : null);
    const venueName = gateContext
      ? venueNameForGate(gateContext.memberType, gateContext.teamLabel)
      : "Employee attendance";

    if (done?.ok && done.eventType === "sign_out" && done.occurredAt) {
      return {
        session: buildEmployeeCheckInSession({
          venueName,
          fullName: activeEmployee.fullName,
          occurredAt: done.occurredAt,
          employeeId: activeEmployee.id,
          department: activeEmployee.department,
          employeeCode: activeEmployee.employeeCode,
        }),
        initialCheckedOut: true,
        checkoutTimeLabel: formatCheckInClock(done.occurredAt),
        checkoutDateLabel: formatCheckInDateLabel(done.occurredAt),
        onCheckOut: undefined,
        onRegisterAnother: gateContext ? reload : undefined,
      };
    }

    const signedInAt =
      done?.ok && done.eventType === "sign_in" && done.occurredAt
        ? done.occurredAt
        : activeEmployee.lastSignedInAt;

    if (!signedInAt) return null;

    const isSignedIn =
      (done?.ok && done.eventType === "sign_in") || activeEmployee.attendanceStatus === "in";

    if (!isSignedIn) return null;

    return {
      session: buildEmployeeCheckInSession({
        venueName,
        fullName: activeEmployee.fullName,
        occurredAt: signedInAt,
        employeeId: activeEmployee.id,
        department: activeEmployee.department,
        employeeCode: activeEmployee.employeeCode,
      }),
      initialCheckedOut: false,
      onCheckOut: async () => {
        if (gateBound) {
          await runScan("sign_out", {
            gate: gateBound.gateToken,
            employeeId: gateBound.employee.id,
            memberType: gateBound.memberType,
            teamLabel: gateBound.teamLabel,
          });
          return;
        }
        if (done?.gateToken && activeEmployee.id) {
          await runScan("sign_out", {
            gate: done.gateToken,
            employeeId: activeEmployee.id,
            memberType: done.memberType,
            teamLabel: done.teamLabel,
          });
          return;
        }
        await runPersonalAction("sign_out");
      },
      onRegisterAnother: gateContext ? reload : undefined,
    };
  }, [activeEmployee, done, gateBound, reload, runPersonalAction, runScan]);

  const showConfirmation = Boolean(confirmationView);
  const showFormShell = !showConfirmation && phase.kind !== "loading" && !submitting;

  return (
    <main className={`min-h-[100dvh] flex flex-col ${showConfirmation ? "bg-gray-50" : "bg-gray-50"}`}>
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

      <div className={`flex-1 flex items-center justify-center p-4 ${showConfirmation ? "pt-6 sm:pt-8" : ""}`}>
        <div className={`w-full ${showConfirmation ? "max-w-md" : "max-w-md"}`}>
          {phase.kind === "loading" || submitting ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <div className="py-4 flex flex-col items-center gap-3 text-gray-600">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                <p className="text-sm font-medium">
                  {submitting
                    ? "Checking your location…"
                    : isGateMode
                      ? "Opening sign-in…"
                      : "Loading your pass…"}
                </p>
              </div>
            </div>
          ) : null}

          {showConfirmation && confirmationView ? (
            <VisitorCheckInConfirmation
              variant="employee"
              session={confirmationView.session}
              initialCheckedOut={confirmationView.initialCheckedOut}
              checkoutTimeLabel={confirmationView.checkoutTimeLabel}
              checkoutDateLabel={confirmationView.checkoutDateLabel}
              onCheckOut={confirmationView.onCheckOut}
              onRegisterAnother={confirmationView.onRegisterAnother}
            />
          ) : null}

          {showFormShell && phase.kind === "error" ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-3">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <p className="text-sm text-red-700">{phase.message}</p>
            </div>
          ) : null}

          {showFormShell && done && !done.ok ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-3">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <p className="text-sm text-red-700">{done.message}</p>
              <button
                type="button"
                onClick={reload}
                className="text-sm font-semibold text-primary-700 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : null}

          {showFormShell && gateSetup ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1 text-center">
                {receptionGateTitle(gateSetup.memberType)}
              </p>
              <form onSubmit={handleMemberCodeSubmit} className="mt-4 space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  <strong>First time on this phone:</strong> enter your unique member ID from your manager.
                  Your phone will be linked so next time you only sign in or out.
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
                  className="w-full rounded-xl bg-primary-600 py-3.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  Link phone & sign in
                </button>
                <p className="text-[10px] text-gray-500 text-center">
                  {gateSetup.teamLabel} team · do not use someone else&apos;s ID
                </p>
              </form>
            </div>
          ) : null}

          {showFormShell && gateBound && gateBound.employee.attendanceStatus === "out" ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                {receptionGateTitle(gateBound.memberType)}
              </p>
              <div>
                <p className="text-lg font-bold text-gray-900">{gateBound.employee.fullName}</p>
                {gateBound.employee.employeeCode ? (
                  <p className="text-xs font-mono text-gray-500 mt-1">ID: {gateBound.employee.employeeCode}</p>
                ) : null}
                {gateBound.employee.department ? (
                  <p className="text-sm text-gray-600 mt-1">{gateBound.employee.department}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  void runScan("sign_in", {
                    gate: gateBound.gateToken,
                    employeeId: gateBound.employee.id,
                    memberType: gateBound.memberType,
                    teamLabel: gateBound.teamLabel,
                  })
                }
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white hover:bg-primary-700"
              >
                <LogIn className="h-5 w-5" />
                Sign in
              </button>
            </div>
          ) : null}

          {showFormShell && ready && ready.attendanceStatus === "out" ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Employee attendance
              </p>
              <div>
                <p className="text-lg font-bold text-gray-900">{ready.fullName}</p>
                {ready.department ? (
                  <p className="text-sm text-gray-600 mt-1">{ready.department}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void runPersonalAction("sign_in")}
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white hover:bg-primary-700"
              >
                <LogIn className="h-5 w-5" />
                Sign in
              </button>
            </div>
          ) : null}

          {!showConfirmation && showFormShell ? (
            <p className="mt-6 text-xs text-gray-500 text-center">
              {isGateMode
                ? "Your phone is linked to your member ID. Location must be on — sign-in/out only works at your registered workplace."
                : "Turn on location to sign in or out at your workplace. Directors receive email when you sign in."}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
