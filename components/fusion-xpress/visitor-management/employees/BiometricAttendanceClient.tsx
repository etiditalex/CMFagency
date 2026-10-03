"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Fingerprint, Loader2, LogIn, XCircle } from "lucide-react";
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

import VisitorCheckInConfirmation from "@/components/fusion-xpress/visitor-management/VisitorCheckInConfirmation";
import { buildEmployeeCheckInSession } from "@/lib/employees/build-check-in-session";
import {
  biometricBrowserError,
  chooseBiometricAttachment,
  type BiometricAttachment,
} from "@/lib/employees/biometric-shared";
import {
  browserDeviceLabel,
  getOrCreateBrowserDeviceId,
  getOrCreateKioskDeviceId,
} from "@/lib/employees/device-fingerprint";
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

type ScanAction = "sign_in" | "sign_out" | "toggle";

type DoneState = {
  ok: boolean;
  message: string;
  eventType?: "sign_in" | "sign_out";
  occurredAt?: string;
  employee?: EmployeePreview;
  businessName?: string;
  emailSent?: boolean;
  employeeEmailSent?: boolean;
};

type Props = {
  mode: "personal" | "station";
};

const autoStarted = new Set<string>();

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: T }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, json };
}

export default function BiometricAttendanceClient({ mode }: Props) {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);
  const isStation = mode === "station";

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [statusText, setStatusText] = useState("Looking for a fingerprint sensor…");
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeePreview | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [platformEnrolled, setPlatformEnrolled] = useState(false);
  const [readerEnrolled, setReaderEnrolled] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [done, setDone] = useState<DoneState | null>(null);
  const runLock = useRef(false);

  const sensorCopy = platformAvailable
    ? "This device will use the fingerprint already set up in its operating system. Place your right thumb on the sensor."
    : "Place your right thumb on the fingerprint reader connected to this device.";

  const loadPersonal = useCallback(async () => {
    if (!token) {
      setError("This biometric link is missing an employee token. Ask your manager for a new link.");
      setLoading(false);
      return null;
    }
    const res = await fetch(`/api/visitor-employees/biometric/status?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      businessName?: string;
      employee?: EmployeePreview;
      platformEnrolled?: boolean;
      readerEnrolled?: boolean;
      error?: string;
    };
    if (!res.ok || !json.employee) {
      setError(json.error ?? "Could not open biometric attendance.");
      setLoading(false);
      return null;
    }
    setEmployee(json.employee);
    setBusinessName(json.businessName?.trim() ?? "");
    setPlatformEnrolled(Boolean(json.platformEnrolled));
    setReaderEnrolled(Boolean(json.readerEnrolled));
    setLoading(false);
    return {
      employee: json.employee,
      platformEnrolled: Boolean(json.platformEnrolled),
      readerEnrolled: Boolean(json.readerEnrolled),
    };
  }, [token]);

  const enroll = useCallback(
    async (attachment: BiometricAttachment) => {
      setStatusText(
        attachment === "platform"
          ? "Recording your right thumb with this device's fingerprint system…"
          : "Recording your right thumb on the fingerprint reader…"
      );
      const optionsRes = await postJson<{
        challengeId?: string;
        options?: PublicKeyCredentialCreationOptionsJSON;
        error?: string;
      }>("/api/visitor-employees/biometric/options", { purpose: "enroll", token, attachment });
      if (!optionsRes.ok || !optionsRes.json.options || !optionsRes.json.challengeId) {
        throw new Error(optionsRes.json.error ?? "Could not start fingerprint enrollment.");
      }
      const response = await startRegistration({ optionsJSON: optionsRes.json.options });
      const saved = await postJson<{ success?: boolean; error?: string }>(
        "/api/visitor-employees/biometric/enroll",
        {
          challengeId: optionsRes.json.challengeId,
          token,
          response,
          deviceLabel: browserDeviceLabel(),
        }
      );
      if (!saved.ok) throw new Error(saved.json.error ?? "Could not record your right thumb.");
      if (attachment === "platform") setPlatformEnrolled(true);
      else setReaderEnrolled(true);
    },
    [token]
  );

  const attend = useCallback(
    async (action: ScanAction, attachment: BiometricAttachment, enrolled: boolean, allowEnroll = true) => {
      if (!isStation && !enrolled && allowEnroll) await enroll(attachment);

      setStatusText("Checking your workplace location…");
      const { getBrowserPosition } = await import("@/lib/employees/browser-geolocation");
      const pos = await getBrowserPosition();

      setStatusText(
        attachment === "platform"
          ? "Scan your right thumb with this device's fingerprint sensor…"
          : "Scan your right thumb on the fingerprint reader…"
      );
      const optionsRes = await postJson<{
        needsEnrollment?: boolean;
        challengeId?: string;
        options?: PublicKeyCredentialRequestOptionsJSON;
        error?: string;
      }>("/api/visitor-employees/biometric/options", {
        purpose: "attend",
        attachment,
        ...(isStation ? { stationToken: token } : { token }),
      });
      if (!optionsRes.ok) throw new Error(optionsRes.json.error ?? "Could not start the fingerprint scan.");
      if (optionsRes.json.needsEnrollment) {
        if (isStation || !allowEnroll) {
          throw new Error(
            "No right thumb is recorded on this reader yet. Open an employee's biometric link on this computer and record their right thumb."
          );
        }
        await enroll(attachment);
        return attend(action, attachment, true, false);
      }
      if (!optionsRes.json.options || !optionsRes.json.challengeId) {
        throw new Error(optionsRes.json.error ?? "Could not start the fingerprint scan.");
      }

      const response = await startAuthentication({ optionsJSON: optionsRes.json.options });
      const deviceId = isStation ? getOrCreateKioskDeviceId() : getOrCreateBrowserDeviceId();
      const saved = await postJson<{
        success?: boolean;
        error?: string;
        eventType?: "sign_in" | "sign_out";
        occurredAt?: string;
        businessName?: string;
        emailSent?: boolean;
        employeeEmailSent?: boolean;
        employee?: EmployeePreview;
      }>("/api/visitor-employees/biometric/attend", {
        challengeId: optionsRes.json.challengeId,
        response,
        action,
        deviceId,
        deviceLabel: browserDeviceLabel(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracyMeters: pos.accuracyMeters,
        ...(isStation ? { stationToken: token } : { token }),
      });
      if (!saved.ok || !saved.json.employee || !saved.json.eventType) {
        throw new Error(saved.json.error ?? "Could not record attendance.");
      }
      if (saved.json.businessName) setBusinessName(saved.json.businessName);
      setEmployee(saved.json.employee);
      setDone({
        ok: true,
        eventType: saved.json.eventType,
        occurredAt: saved.json.occurredAt,
        employee: saved.json.employee,
        businessName: saved.json.businessName,
        emailSent: saved.json.emailSent,
        employeeEmailSent: saved.json.employeeEmailSent,
        message:
          saved.json.eventType === "sign_in"
            ? "Right thumb verified. You are signed in."
            : "Right thumb verified. You are signed out.",
      });
    },
    [enroll, isStation, token]
  );

  const run = useCallback(
    async (
      action: ScanAction,
      prefer?: BiometricAttachment,
      enrollment?: { platformEnrolled: boolean; readerEnrolled: boolean },
      forceEnroll = false
    ) => {
      if (runLock.current) return;
      runLock.current = true;
      setWorking(true);
      setError(null);
      setDone(null);
      const phoneEnrolled = enrollment?.platformEnrolled ?? platformEnrolled;
      const externalEnrolled = enrollment?.readerEnrolled ?? readerEnrolled;
      try {
        if (!window.isSecureContext || !browserSupportsWebAuthn()) {
          throw new Error(
            "This browser cannot use a fingerprint sensor. Open the link in Chrome or Safari on the phone, or use a fingerprint reader."
          );
        }
        const platform = await platformAuthenticatorIsAvailable().catch(() => false);
        setPlatformAvailable(platform);
        let attachment: BiometricAttachment = isStation
          ? prefer ?? "cross-platform"
          : chooseBiometricAttachment({
              platformAvailable: platform,
              platformEnrolled: phoneEnrolled,
              readerEnrolled: externalEnrolled,
              prefer,
            });
        const enrolled = forceEnroll ? false : attachment === "platform" ? phoneEnrolled : externalEnrolled;
        try {
          await attend(action, attachment, enrolled || isStation);
        } catch (firstError: unknown) {
          const firstName = firstError instanceof Error ? firstError.name : "";
          if (isStation && attachment === "cross-platform" && platform && firstName === "NotSupportedError") {
            attachment = "platform";
            await attend(action, "platform", true);
            return;
          }
          throw firstError;
        }
      } catch (e: unknown) {
        setDone({ ok: false, message: biometricBrowserError(e) });
      } finally {
        runLock.current = false;
        setWorking(false);
      }
    },
    [attend, isStation, platformEnrolled, readerEnrolled]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const platform = await platformAuthenticatorIsAvailable().catch(() => false);
      if (!cancelled) setPlatformAvailable(platform);
      if (isStation) {
        setLoading(false);
        if (!token) {
          setError("This fingerprint station link is not valid.");
          return;
        }
        const key = `station:${token}`;
        if (autoStarted.has(key)) return;
        autoStarted.add(key);
        await run("toggle", platform ? undefined : "cross-platform");
        return;
      }
      const loaded = await loadPersonal();
      if (cancelled || !loaded) return;
      if (loaded.employee.attendanceStatus !== "out") return;
      const key = `personal:${token}`;
      if (autoStarted.has(key)) return;
      autoStarted.add(key);
      await run("sign_in", undefined, {
        platformEnrolled: loaded.platformEnrolled,
        readerEnrolled: loaded.readerEnrolled,
      });
    })();
    return () => {
      cancelled = true;
    };
    // Auto-start once when the link opens. Manual buttons call run() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStation, token]);

  const active = done?.ok && done.employee ? done.employee : employee;
  const confirmation = useMemo(() => {
    if (!active) return null;
    const venueName = done?.businessName?.trim() || businessName || "Your organisation";
    if (done?.ok && done.eventType === "sign_out" && done.occurredAt) {
      return {
        session: buildEmployeeCheckInSession({
          venueName,
          fullName: active.fullName,
          occurredAt: done.occurredAt,
          employeeId: active.id,
          department: active.department,
          employeeCode: active.employeeCode,
          emailSent: done.emailSent,
          employeeEmailSent: done.employeeEmailSent,
        }),
        initialCheckedOut: true,
        checkoutTimeLabel: formatCheckInClock(done.occurredAt),
        checkoutDateLabel: formatCheckInDateLabel(done.occurredAt),
      };
    }
    const signedInAt =
      done?.ok && done.eventType === "sign_in" && done.occurredAt ? done.occurredAt : active.lastSignedInAt;
    const isSignedIn = (done?.ok && done.eventType === "sign_in") || active.attendanceStatus === "in";
    if (!isSignedIn || !signedInAt || done?.ok === false) return null;
    return {
      session: buildEmployeeCheckInSession({
        venueName,
        fullName: active.fullName,
        occurredAt: signedInAt,
        employeeId: active.id,
        department: active.department,
        employeeCode: active.employeeCode,
        emailSent: done?.emailSent,
        employeeEmailSent: done?.employeeEmailSent,
      }),
      initialCheckedOut: false,
    };
  }, [active, businessName, done]);

  const showConfirmation = Boolean(confirmation) && !working;

  return (
    <main className="min-h-[100dvh] bg-gray-50">
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <div className="w-full max-w-md">
          {loading || working ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-600" />
              <p className="mt-3 text-sm font-medium text-gray-700">{working ? statusText : "Opening biometric attendance…"}</p>
              <p className="mt-2 text-xs text-gray-500">
                {working ? sensorCopy : "Searching this device for its fingerprint sensor…"}
              </p>
            </div>
          ) : null}

          {showConfirmation && confirmation ? (
            <div className="space-y-3">
              <VisitorCheckInConfirmation
                variant="employee"
                session={confirmation.session}
                initialCheckedOut={confirmation.initialCheckedOut}
                checkoutTimeLabel={confirmation.checkoutTimeLabel}
                checkoutDateLabel={confirmation.checkoutDateLabel}
                onCheckOut={
                  confirmation.initialCheckedOut
                    ? undefined
                    : async () => {
                        await run(isStation ? "toggle" : "sign_out");
                      }
                }
                onRegisterAnother={
                  isStation
                    ? () => {
                        setDone(null);
                        void run("toggle");
                      }
                    : undefined
                }
              />
            </div>
          ) : null}

          {!loading && !working && error ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-3 text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          {!loading && !working && done && !done.ok ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm space-y-3">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <p className="text-sm text-red-700">{done.message}</p>
              <button
                type="button"
                onClick={() => void run(isStation ? "toggle" : employee?.attendanceStatus === "in" ? "sign_out" : "sign_in")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white"
              >
                <Fingerprint className="h-5 w-5" />
                Scan right thumb
              </button>
              {!isStation ? (
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      employee?.attendanceStatus === "in" ? "sign_out" : "sign_in",
                      platformAvailable ? "platform" : "cross-platform",
                      undefined,
                      true
                    )
                  }
                  className="text-sm font-semibold text-primary-700"
                >
                  Record right thumb on this device
                </button>
              ) : null}
            </div>
          ) : null}

          {!loading && !working && !showConfirmation && !error && !done && employee && employee.attendanceStatus === "out" ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Biometric attendance</p>
              <div>
                <p className="text-lg font-bold text-gray-900">{employee.fullName}</p>
                {employee.department ? <p className="mt-1 text-sm text-gray-600">{employee.department}</p> : null}
              </div>
              <p className="text-sm text-gray-600">{sensorCopy}</p>
              <button
                type="button"
                onClick={() => void run("sign_in")}
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white"
              >
                <LogIn className="h-5 w-5" />
                Sign in with right thumb
              </button>
              <button
                type="button"
                onClick={() => void run("sign_in", platformAvailable ? "cross-platform" : "platform")}
                className="text-sm font-semibold text-primary-700"
              >
                {platformAvailable ? "Use a fingerprint reader instead" : "Use this device's fingerprint instead"}
              </button>
            </div>
          ) : null}

          {!loading && !working && isStation && !showConfirmation && !error && (!done || done.ok) ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm space-y-4">
              <Fingerprint className="mx-auto h-10 w-10 text-primary-700" />
              <p className="text-lg font-bold text-gray-900">Fingerprint station</p>
              <p className="text-sm text-gray-600">
                Place your right thumb on the reader. Attendance is recorded the same way as a QR scan.
              </p>
              <button
                type="button"
                onClick={() => void run("toggle")}
                className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary-600 py-3.5 text-base font-bold text-white"
              >
                <Fingerprint className="h-5 w-5" />
                Scan right thumb
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
