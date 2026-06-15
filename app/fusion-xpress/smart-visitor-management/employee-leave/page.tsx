"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import DigitalSignaturePad from "@/components/fusion-xpress/visitor-management/employees/DigitalSignaturePad";
import {
  earliestAdvanceLeaveStartYmd,
  leaveTypeRequiresAdvanceNotice,
  leaveTypeRequiresAttachment,
  publicLeaveDayCount,
  PUBLIC_LEAVE_FORM_TYPES,
  type PublicLeaveFormType,
  validateLeaveAttachment,
} from "@/lib/employees/leave-application";
import { eatTodayDayKey } from "@/lib/time/eat";

type EmployeePreview = {
  fullName: string;
  designation: string;
  jobLocation: string;
  email: string | null;
  employeeCode: string | null;
};

type LookupPayload = {
  employee: EmployeePreview;
  organization: { name: string };
  policy: { advanceNoticeDays: number };
};

type PagePhase =
  | { kind: "loading" }
  | { kind: "ready"; data: LookupPayload }
  | { kind: "error"; message: string }
  | { kind: "submitted"; message: string };

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 min-h-[42px] flex items-center">
        {value || "—"}
      </div>
    </label>
  );
}

export default function EmployeeLeaveApplicationPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams?.get("token")?.trim() ?? "", [searchParams]);

  const [phase, setPhase] = useState<PagePhase>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [leaveType, setLeaveType] = useState<PublicLeaveFormType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const today = eatTodayDayKey();
  const minAdvanceStart = earliestAdvanceLeaveStartYmd();

  const totalDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    return publicLeaveDayCount(startDate, endDate);
  }, [startDate, endDate]);

  const load = useCallback(async (qrToken: string) => {
    if (!qrToken) {
      setPhase({
        kind: "error",
        message: "Invalid leave link. Ask your manager for your personal leave application link.",
      });
      return;
    }

    setPhase({ kind: "loading" });
    try {
      const res = await fetch(
        `/api/visitor-employees/leave/lookup?token=${encodeURIComponent(qrToken)}`,
        { cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as LookupPayload & { error?: string };
      if (!res.ok) {
        setPhase({ kind: "error", message: json.error ?? "Could not load your profile." });
        return;
      }
      if (!json.employee) {
        setPhase({ kind: "error", message: "Employee not found." });
        return;
      }
      setPhase({ kind: "ready", data: json });
      const defaultStart = leaveTypeRequiresAdvanceNotice("annual") ? minAdvanceStart : today;
      setStartDate(defaultStart);
      setEndDate(defaultStart);
    } catch (e: unknown) {
      setPhase({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }, [minAdvanceStart, today]);

  useEffect(() => {
    void load(token);
  }, [token, load]);

  useEffect(() => {
    if (leaveTypeRequiresAdvanceNotice(leaveType) && startDate && startDate < minAdvanceStart) {
      setStartDate(minAdvanceStart);
      if (endDate < minAdvanceStart) setEndDate(minAdvanceStart);
    }
  }, [leaveType, minAdvanceStart, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const attachmentCheck = validateLeaveAttachment(attachment, leaveType);
    if (!attachmentCheck.ok) {
      setSubmitError(attachmentCheck.error);
      return;
    }
    if (!signatureDataUrl) {
      setSubmitError("Draw your signature in the applicant signature box before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/visitor-employees/leave/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          leaveType,
          startDate,
          endDate,
          reason,
          attachmentName: attachmentCheck.file?.name ?? null,
          signatureDataUrl,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setSubmitError(json.error ?? "Could not submit leave application.");
        return;
      }
      setPhase({
        kind: "submitted",
        message:
          json.message ??
          "Your leave application was submitted and is pending manager approval.",
      });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Could not submit leave application.");
    } finally {
      setSubmitting(false);
    }
  };

  const ready = phase.kind === "ready" ? phase.data : null;

  return (
    <div className="min-h-[100dvh] bg-[#f4f5f7] py-6 px-4 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <article className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
            <div className="px-6 sm:px-10 pt-8 pb-6 border-b border-gray-200 text-center">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide text-gray-900 uppercase underline decoration-2 underline-offset-4">
                Employee Leave Application Form
              </h1>
              {ready ? (
                <p className="mt-3 text-sm font-semibold text-gray-700">{ready.organization.name}</p>
              ) : null}
            </div>

            <div className="px-6 sm:px-10 py-8">
              {phase.kind === "loading" || submitting ? (
                <div className="py-12 flex flex-col items-center gap-3 text-gray-600">
                  <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                  <p className="text-sm font-medium">
                    {submitting ? "Submitting your application…" : "Loading your details…"}
                  </p>
                </div>
              ) : null}

              {phase.kind === "error" ? (
                <div className="py-8 space-y-3 text-center">
                  <XCircle className="w-12 h-12 mx-auto text-red-500" />
                  <p className="text-sm text-red-700">{phase.message}</p>
                </div>
              ) : null}

              {phase.kind === "submitted" ? (
                <div className="py-8 space-y-4 text-center">
                  <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-600" />
                  <h2 className="text-lg font-bold text-gray-900">Application submitted</h2>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">{phase.message}</p>
                  <p className="text-xs text-gray-500">
                    Your manager will review this request in the employee dashboard.
                  </p>
                </div>
              ) : null}

              {ready ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-1">
                    <ReadonlyField label="Name of the Employee" value={ready.employee.fullName} />
                    <ReadonlyField label="Designation" value={ready.employee.designation} />
                    <ReadonlyField label="Job Location" value={ready.employee.jobLocation} />
                  </div>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-gray-800">
                      Nature of Leave to be availed (Annual / Casual / Sick / Compassionate / Unpaid)
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {PUBLIC_LEAVE_FORM_TYPES.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-3 text-sm cursor-pointer transition-colors ${
                            leaveType === option.value
                              ? "border-primary-400 bg-primary-50 text-primary-900"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="leaveType"
                            value={option.value}
                            checked={leaveType === option.value}
                            onChange={() => setLeaveType(option.value)}
                            className="text-primary-600 focus:ring-primary-500"
                          />
                          <span className="font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">Date of Leave — From</span>
                      <input
                        type="date"
                        value={startDate}
                        min={leaveTypeRequiresAdvanceNotice(leaveType) ? minAdvanceStart : undefined}
                        onChange={(e) => {
                          const next = e.target.value;
                          setStartDate(next);
                          if (endDate < next) setEndDate(next);
                        }}
                        required
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">To</span>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>

                  <ReadonlyField
                    label="Total Number of Leave Days"
                    value={totalDays > 0 ? String(totalDays) : "—"}
                  />

                  <label className="block">
                    <span className="text-sm font-semibold text-gray-800">Reason for taking leave</span>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                      rows={4}
                      maxLength={2000}
                      placeholder="Provide a brief explanation for your leave request"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm resize-y min-h-[100px]"
                    />
                  </label>

                  {leaveTypeRequiresAttachment(leaveType) ? (
                    <label className="block">
                      <span className="text-sm font-semibold text-gray-800">
                        Supportive document (required for sick leave)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                        className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-100"
                      />
                      <p className="mt-1 text-xs text-gray-500">JPEG, PNG, WebP, or PDF · max 1.5 MB</p>
                    </label>
                  ) : null}

                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 leading-relaxed">
                    Submit annual, casual, or unpaid leave at least two days before your first absent day.
                    Sick and compassionate leave may be submitted for urgent circumstances — attach a
                    supportive document for sick leave.
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2 items-start border-t border-gray-300 pt-6">
                    <ReadonlyField label="Date" value={today} />
                    <DigitalSignaturePad
                      value={signatureDataUrl}
                      onChange={setSignatureDataUrl}
                      disabled={submitting}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    By signing above, you confirm that the information provided is accurate and you are
                    applying for leave as the named employee.
                  </p>

                  {submitError ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                      {submitError}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting || totalDays < 1 || !signatureDataUrl}
                    className="w-full rounded-lg bg-primary-700 py-3.5 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit leave application"}
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        </div>
    </div>
  );
}
