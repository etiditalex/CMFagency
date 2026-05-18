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
import { formatEmployeeTimestamp } from "@/lib/employees/utils";

type EmployeePreview = {
  id: string;
  fullName: string;
  department: string;
  attendanceStatus: "in" | "out";
  lastSignedInAt: string | null;
  lastSignedOutAt: string | null;
};

type PagePhase =
  | { kind: "loading" }
  | { kind: "ready"; employee: EmployeePreview }
  | { kind: "error"; message: string }
  | {
      kind: "done";
      ok: boolean;
      eventType?: "sign_in" | "sign_out";
      employeeName?: string;
      occurredAt?: string;
      message: string;
    };

export default function EmployeeCheckPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);

  const [phase, setPhase] = useState<PagePhase>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async (qrToken: string) => {
    if (!qrToken) {
      setPhase({
        kind: "error",
        message: "Invalid employee QR link. Ask your manager for a new pass.",
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

  useEffect(() => {
    void loadStatus(token);
  }, [token, loadStatus]);

  const runAction = useCallback(
    async (action: "sign_in" | "sign_out") => {
      if (!token) return;
      setSubmitting(true);
      try {
        const deviceId = getOrCreateBrowserDeviceId();
        const res = await fetch("/api/visitor-employees/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action,
            deviceId,
            deviceLabel: browserDeviceLabel(),
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
          message: signedIn
            ? "You are signed in. Scan your QR again at the kiosk when you leave."
            : "You are signed out. See you next time.",
        });
      } catch (e: unknown) {
        setPhase({
          kind: "done",
          ok: false,
          message: e instanceof Error ? e.message : "Network error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [token]
  );

  const ready = phase.kind === "ready" ? phase.employee : null;
  const done = phase.kind === "done" ? phase : null;
  const signedInDone = done?.eventType === "sign_in";

  return (
    <main className="min-h-[100dvh] bg-gray-50 flex flex-col">
      <header className="border-b border-gray-100 bg-white px-4 py-4">
        <div className="mx-auto max-w-md flex items-center justify-between gap-3">
          <Image src={BRAND_LOGO_URL} alt="Fusion Xpress" width={120} height={36} className="h-8 w-auto" />
          <Link
            href="/fusion-xpress/smart-visitor-management/sign-in"
            className="text-xs font-semibold text-primary-700 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-2">
            Employee attendance
          </p>

          {phase.kind === "loading" || submitting ? (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
              <p className="text-sm font-medium">
                {submitting ? "Recording…" : "Loading your pass…"}
              </p>
            </div>
          ) : null}

          {phase.kind === "error" ? (
            <div className="py-4 space-y-3">
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <p className="text-sm text-red-700">{phase.message}</p>
            </div>
          ) : null}

          {ready && phase.kind === "ready" ? (
            <div className="py-4 space-y-4">
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
                  <p className="text-xs text-gray-500">
                    Sign-out does not happen automatically. Use the kiosk and scan your QR again when
                    you leave, or tap below.
                  </p>
                  <button
                    type="button"
                    onClick={() => void runAction("sign_out")}
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
                    onClick={() => void runAction("sign_in")}
                    className="w-full rounded-lg bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          ) : null}

          {done ? (
            <div className="py-4 space-y-4">
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
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 mx-auto text-red-500" />
                  <p className="text-sm text-red-700">{done.message}</p>
                  <button
                    type="button"
                    onClick={() => void loadStatus(token)}
                    className="text-sm font-semibold text-primary-700 hover:underline"
                  >
                    Try again
                  </button>
                </>
              )}
            </div>
          ) : null}

          <p className="mt-6 text-xs text-gray-500">
            Directors receive email when you sign in. Sign-out uses a separate scan at the reception
            kiosk.
          </p>
        </div>
      </div>
    </main>
  );
}
