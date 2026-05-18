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

type ScanState =
  | { phase: "idle" }
  | { phase: "loading" }
  | {
      phase: "done";
      ok: boolean;
      eventType?: "sign_in" | "sign_out";
      employeeName?: string;
      occurredAt?: string;
      message: string;
    };

export default function EmployeeCheckPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);

  const [state, setState] = useState<ScanState>({ phase: "idle" });

  const runScan = useCallback(async (qrToken: string) => {
    if (!qrToken) {
      setState({
        phase: "done",
        ok: false,
        message: "Missing QR token. Use the link from your employee pass.",
      });
      return;
    }

    setState({ phase: "loading" });
    try {
      const deviceId = getOrCreateBrowserDeviceId();
      const res = await fetch("/api/visitor-employees/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: qrToken,
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
        setState({
          phase: "done",
          ok: false,
          message: json.error ?? "Could not record attendance.",
        });
        return;
      }

      const signedIn = json.eventType === "sign_in";
      setState({
        phase: "done",
        ok: true,
        eventType: json.eventType,
        employeeName: json.employee?.fullName,
        occurredAt: json.occurredAt,
        message: signedIn
          ? "You are signed in. Have a productive day."
          : "You are signed out. See you next time.",
      });
    } catch (e: unknown) {
      setState({
        phase: "done",
        ok: false,
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, []);

  useEffect(() => {
    if (token) void runScan(token);
    else {
      setState({
        phase: "done",
        ok: false,
        message: "Invalid employee QR link. Ask your manager for a new pass.",
      });
    }
  }, [token, runScan]);

  const signedIn = state.phase === "done" && state.eventType === "sign_in";

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
          {state.phase === "loading" ? (
            <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
              <p className="text-sm font-medium">Recording your attendance…</p>
            </div>
          ) : state.phase === "done" ? (
            <div className="py-4 space-y-4">
              {state.ok ? (
                <>
                  {signedIn ? (
                    <LogIn className="w-12 h-12 mx-auto text-emerald-600" />
                  ) : (
                    <LogOut className="w-12 h-12 mx-auto text-slate-600" />
                  )}
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 -mt-2" />
                  <h2 className="text-xl font-extrabold text-gray-900">
                    {signedIn ? "Signed in" : "Signed out"}
                  </h2>
                  {state.employeeName ? (
                    <p className="text-sm font-semibold text-gray-800">{state.employeeName}</p>
                  ) : null}
                  <p className="text-sm text-gray-600">{state.message}</p>
                  {state.occurredAt ? (
                    <p className="text-xs text-gray-500">
                      {formatEmployeeTimestamp(state.occurredAt)}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 mx-auto text-red-500" />
                  <h2 className="text-lg font-bold text-gray-900">Unable to check in</h2>
                  <p className="text-sm text-red-700">{state.message}</p>
                </>
              )}
            </div>
          ) : null}
          <p className="mt-6 text-xs text-gray-500">
            Your organisation directors receive an email when you sign in or out. This device is
            recorded for attendance audit.
          </p>
        </div>
      </div>
    </main>
  );
}
