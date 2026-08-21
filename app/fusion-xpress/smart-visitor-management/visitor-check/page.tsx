"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Loader2, Smartphone, XCircle } from "lucide-react";

import VisitorCheckInConfirmation, {
  type CheckInSession,
} from "@/components/fusion-xpress/visitor-management/VisitorCheckInConfirmation";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { visitorDevicePayload } from "@/lib/visitors/device";

type PagePhase =
  | { kind: "loading" }
  | { kind: "need-phone"; message: string; visitorName?: string }
  | { kind: "error"; message: string }
  | { kind: "done"; session: CheckInSession };

function ArrivalCheckInner() {
  const searchParams = useSearchParams();
  const gate = useMemo(() => searchParams?.get("gate")?.trim() ?? "", [searchParams]);
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);

  const [phase, setPhase] = useState<PagePhase>({ kind: "loading" });
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scan = useCallback(
    async (phoneOverride?: string) => {
      if (!gate && !token) {
        setPhase({
          kind: "error",
          message: "Invalid visitor QR. Scan the reception code or ask the host for the pre-registration link.",
        });
        return;
      }
      setSubmitting(true);
      try {
        const device = visitorDevicePayload();
        const res = await fetch("/api/visitors/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gate: gate || undefined,
            token: token || undefined,
            phone: phoneOverride ?? phone,
            ...device,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          needsPhone?: boolean;
          visitorName?: string;
          checkIn?: CheckInSession;
        };
        if (json.needsPhone) {
          setPhase({
            kind: "need-phone",
            message:
              json.error ??
              "Enter the contact number you used when you pre-registered.",
            visitorName: json.visitorName,
          });
          return;
        }
        if (!res.ok) throw new Error(json.error ?? "Could not verify this scan.");
        if (!json.checkIn) throw new Error("Scan response incomplete.");
        setPhase({ kind: "done", session: json.checkIn });
      } catch (e: unknown) {
        setPhase({
          kind: "error",
          message: e instanceof Error ? e.message : "Could not verify this scan.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [gate, token, phone]
  );

  useEffect(() => {
    void scan("");
    // First attempt uses the device bound at pre-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gate, token]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image
            src={BRAND_LOGO_URL}
            alt="CMF Agency"
            width={140}
            height={46}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        {phase.kind === "loading" ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
            <p className="mt-3 text-sm font-semibold text-gray-700">Verifying your pre-registration…</p>
          </div>
        ) : null}

        {phase.kind === "need-phone" ? (
          <form
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void scan(phone);
            }}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Smartphone className="h-6 w-6 text-primary-700" />
            </div>
            <h1 className="text-center text-lg font-extrabold text-gray-900">Confirm your visit</h1>
            {phase.visitorName ? (
              <p className="mt-1 text-center text-sm text-gray-600">{phase.visitorName}</p>
            ) : null}
            <p className="mt-3 text-center text-sm text-gray-600">{phase.message}</p>
            <label className="mt-5 block text-sm">
              <span className="mb-1.5 block font-medium text-gray-700">Contact number *</span>
              <div className="flex overflow-hidden rounded-lg border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
                <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
                  +254
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="712 345 678"
                  className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={submitting || !phone.trim()}
              className="mt-5 w-full rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Verify and check in"}
            </button>
          </form>
        ) : null}

        {phase.kind === "error" ? (
          <div className="rounded-2xl border border-red-100 bg-white px-6 py-10 text-center shadow-sm">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm font-semibold text-red-800">{phase.message}</p>
          </div>
        ) : null}

        {phase.kind === "done" ? (
          <VisitorCheckInConfirmation
            session={phase.session}
            onCheckOut={
              phase.session.visitorId
                ? async () => {
                    const res = await fetch(
                      `/api/visitors/${encodeURIComponent(phase.session.visitorId)}/check-out`,
                      { method: "POST" }
                    );
                    const json = (await res.json().catch(() => ({}))) as { error?: string };
                    if (!res.ok) throw new Error(json.error ?? "Check-out failed");
                  }
                : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
}

export default function VisitorArrivalCheckPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
          Loading visitor check…
        </div>
      }
    >
      <ArrivalCheckInner />
    </Suspense>
  );
}
