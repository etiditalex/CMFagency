"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LogIn, LogOut, Search, XCircle } from "lucide-react";

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
  attendanceStatus: "in" | "out";
  lastSignedInAt: string | null;
  lastSignedOutAt: string | null;
};

type RosterEntry = {
  id: string;
  fullName: string;
  department: string;
  attendanceStatus: "in" | "out";
};

type PagePhase =
  | { kind: "loading" }
  | { kind: "ready"; employee: EmployeePreview }
  | {
      kind: "gate";
      gateToken: string;
      teamLabel: string;
      memberType: EmployeeMemberType;
      roster: RosterEntry[];
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
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<RosterEntry | null>(null);

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

  const loadGateRoster = useCallback(async (gate: string) => {
    if (!gate) {
      setPhase({ kind: "error", message: "Invalid reception QR. Ask your manager for a new poster." });
      return;
    }

    setPhase({ kind: "loading" });
    setPicked(null);
    setSearch("");
    try {
      const res = await fetch(`/api/visitor-employees/roster?gate=${encodeURIComponent(gate)}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        gate?: { memberType: EmployeeMemberType; teamLabel: string };
        roster?: RosterEntry[];
        error?: string;
      };
      if (!res.ok) {
        setPhase({ kind: "error", message: json.error ?? "Could not open sign-in." });
        return;
      }
      const memberType = json.gate?.memberType ?? "staff";
      setPhase({
        kind: "gate",
        gateToken: gate,
        teamLabel: json.gate?.teamLabel ?? receptionGateTitle(memberType).replace(" — sign in", ""),
        memberType,
        roster: Array.isArray(json.roster) ? json.roster : [],
      });
    } catch (e: unknown) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, []);

  useEffect(() => {
    if (isGateMode) void loadGateRoster(gateToken);
    else void loadPersonalPass(token);
  }, [isGateMode, gateToken, token, loadGateRoster, loadPersonalPass]);

  const runScan = useCallback(
    async (
      action: "sign_in" | "sign_out",
      opts: { token?: string; gate?: string; employeeId?: string }
    ) => {
      setSubmitting(true);
      try {
        const deviceId = getOrCreateBrowserDeviceId();
        const body: Record<string, string> = {
          action,
          deviceId,
          deviceLabel: browserDeviceLabel(),
        };
        if (opts.gate) body.gate = opts.gate;
        if (opts.employeeId) body.employeeId = opts.employeeId;
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

  const handleGatePick = useCallback(
    (entry: RosterEntry) => {
      if (!gateToken) return;
      if (entry.attendanceStatus === "out") {
        void runScan("sign_in", { gate: gateToken, employeeId: entry.id });
        return;
      }
      setPicked(entry);
    },
    [gateToken, runScan]
  );

  const filteredRoster = useMemo(() => {
    if (phase.kind !== "gate") return [];
    const q = search.trim().toLowerCase();
    if (!q) return phase.roster;
    return phase.roster.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)
    );
  }, [phase, search]);

  const ready = phase.kind === "ready" ? phase.employee : null;
  const gate = phase.kind === "gate" ? phase : null;
  const done = phase.kind === "done" ? phase : null;
  const signedInDone = done?.eventType === "sign_in";

  const backToGate = () => {
    if (gateToken) void loadGateRoster(gateToken);
    else if (token) void loadPersonalPass(token);
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
          {gate ? (
            <h1 className="text-lg font-extrabold text-gray-900 text-center mb-4">
              {receptionGateTitle(gate.memberType)}
            </h1>
          ) : (
            <p className="text-center text-sm text-gray-500 mb-4">Sign in or sign out</p>
          )}

          {phase.kind === "loading" || submitting ? (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
              <p className="text-sm font-medium">
                {submitting ? "Recording…" : isGateMode ? "Opening sign-in…" : "Loading your pass…"}
              </p>
            </div>
          ) : null}

          {phase.kind === "error" ? (
            <div className="py-4 space-y-3 text-center">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <p className="text-sm text-red-700">{phase.message}</p>
            </div>
          ) : null}

          {gate && phase.kind === "gate" && !picked ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Tap your name to sign in. If you are already signed in, tap your name to sign out.
              </p>
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name…"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
                  autoComplete="off"
                />
              </label>
              {filteredRoster.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {gate.roster.length === 0
                    ? "No active team members yet. Ask your manager to add staff."
                    : "No match for your search."}
                </p>
              ) : (
                <ul className="max-h-[min(50vh,320px)] overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {filteredRoster.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => handleGatePick(entry)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-primary-50/80 transition-colors"
                      >
                        <span>
                          <span className="block font-semibold text-gray-900">{entry.fullName}</span>
                          {entry.department ? (
                            <span className="block text-xs text-gray-500">{entry.department}</span>
                          ) : null}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            entry.attendanceStatus === "in"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {entry.attendanceStatus === "in" ? "In" : "Sign in"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {gate && picked ? (
            <div className="py-2 space-y-4 text-center">
              <p className="text-lg font-bold text-gray-900">{picked.fullName}</p>
              <LogIn className="w-10 h-10 mx-auto text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">You are signed in</p>
              <p className="text-xs text-gray-500">Tap below when you leave.</p>
              <button
                type="button"
                onClick={() =>
                  void runScan("sign_out", { gate: gateToken, employeeId: picked.id })
                }
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
              >
                Sign out now
              </button>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="text-xs font-semibold text-primary-700 hover:underline"
              >
                ← Choose someone else
              </button>
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
                      onClick={backToGate}
                      className="text-sm font-semibold text-primary-700 hover:underline"
                    >
                      Back to team list
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 mx-auto text-red-500" />
                  <p className="text-sm text-red-700">{done.message}</p>
                  <button
                    type="button"
                    onClick={backToGate}
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
              ? "Scan the reception QR to open this page. Directors receive email when you sign in."
              : "Directors receive email when you sign in. Use the reception QR for your team where available."}
          </p>
        </div>
      </div>
    </main>
  );
}
