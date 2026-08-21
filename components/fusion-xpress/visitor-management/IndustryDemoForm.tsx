"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import VisitorCheckInConfirmation, {
  type CheckInSession,
} from "@/components/fusion-xpress/visitor-management/VisitorCheckInConfirmation";
import VisitorPreRegisterConfirmation, {
  type PreRegisterSession,
} from "@/components/fusion-xpress/visitor-management/VisitorPreRegisterConfirmation";
import {
  buildCheckInSessionFromForm,
  defaultVenueNameForDemo,
} from "@/lib/visitors/build-check-in-session";
import { visitorDevicePayload } from "@/lib/visitors/device";
import type { IndustryDemo } from "@/lib/visitors/industry-demos";
import type { DemoField } from "@/lib/visitors/industry-demos";

type IndustryDemoFormProps = {
  demo: IndustryDemo;
  /** Business owner id from ?owner= on the check-in URL */
  ownerId?: string;
  /** Public marketing page vs Fusion Xpress dashboard */
  variant?: "public" | "dashboard";
  /** Shareable early registration vs walk-in check-in */
  mode?: "checkin" | "preregister";
  /** Dashboard: persist via authenticated visitors API */
  onDashboardSubmit?: (values: Record<string, string | string[]>) => Promise<void>;
  /** Hide page chrome when showing check-in confirmation */
  onCheckInScreen?: (active: boolean) => void;
};

const DATE_FIELD_NAMES = new Set(["visitDate", "viewingDate", "checkInDate"]);
const ID_FIELD_NAMES = new Set(["idNumber", "idPassport", "idPassportNumber"]);
const CONTACT_FIELD_NAMES = new Set(["fullName", "phone", "email"]);

function fieldLabelSuffix(field: DemoField): string {
  if (field.required) return " *";
  if (field.recommended) return " (recommended)";
  return "";
}

function insertAfterContactFields(fields: DemoField[], field: DemoField): DemoField[] {
  let lastContact = -1;
  fields.forEach((f, i) => {
    if (CONTACT_FIELD_NAMES.has(f.name)) lastContact = i;
  });
  if (lastContact < 0) return [field, ...fields];
  return [...fields.slice(0, lastContact + 1), field, ...fields.slice(lastContact + 1)];
}

function withPreregisterFields(demo: IndustryDemo): IndustryDemo {
  const hasVisitDate = demo.sections.some((s) =>
    s.fields.some((f) => f.type === "date" && DATE_FIELD_NAMES.has(f.name))
  );
  const hasIdNumber = demo.sections.some((s) =>
    s.fields.some((f) => ID_FIELD_NAMES.has(f.name))
  );
  const visitDateField: DemoField = {
    name: "visitDate",
    label: "Expected visit date",
    type: "date",
    required: true,
  };
  const idNumberField: DemoField = {
    name: "idNumber",
    label: "ID / Passport Number",
    type: "text",
    recommended: true,
    placeholder: "National ID or passport",
  };

  let firstFields = [...(demo.sections[0]?.fields ?? [])];
  if (!hasVisitDate) firstFields = [visitDateField, ...firstFields];
  if (!hasIdNumber) firstFields = insertAfterContactFields(firstFields, idNumberField);

  return {
    ...demo,
    subtitle: "Guest pre-registration",
    sections: [{ ...demo.sections[0], fields: firstFields }, ...demo.sections.slice(1)],
  };
}

function demoHasEmailField(demo: IndustryDemo) {
  return demo.sections.some((s) => s.fields.some((f) => f.name === "email" || f.type === "email"));
}

function textInputClass() {
  return "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: DemoField;
  value: string | string[];
  onChange: (name: string, value: string | string[]) => void;
}) {
  if (field.type === "number-visitors" || field.type === "select") {
    return (
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-gray-700">
          {field.label}
          {fieldLabelSuffix(field)}
        </span>
        <select
          name={field.name}
          required={field.required}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">{field.placeholder ?? "Select…"}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "checkbox-group") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="text-sm">
        <legend className="mb-3 font-medium text-gray-900">{field.label}</legend>
        <div className="space-y-2.5">
          {(field.checkboxes ?? []).map((cb) => (
            <label key={cb.value} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                name={field.name}
                value={cb.value}
                checked={selected.includes(cb.value)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, cb.value]
                    : selected.filter((v) => v !== cb.value);
                  onChange(field.name, next);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">{cb.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-gray-700">{field.label}</span>
        <textarea
          name={field.name}
          rows={3}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(field.name, e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </label>
    );
  }

  if (field.type === "tel") {
    return (
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-gray-700">
          {field.label}
          {fieldLabelSuffix(field)}
        </span>
        <div className="flex overflow-hidden rounded-lg border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20">
          <span className="flex items-center gap-1 border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">
            🇰🇪 +254
          </span>
          <input
            type="tel"
            name={field.name}
            required={field.required}
            placeholder={field.placeholder}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none"
          />
        </div>
      </label>
    );
  }

  const inputType =
    field.type === "email" ? "email" : field.type === "date" ? "date" : "text";

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-gray-700">
        {field.label}
        {fieldLabelSuffix(field)}
      </span>
      {field.recommended && !field.required ? (
        <span className="mb-1.5 block text-xs text-gray-500">
          Recommended for faster verification when you arrive.
        </span>
      ) : null}
      <input
        type={inputType}
        name={field.name}
        required={field.required}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(field.name, e.target.value)}
        className={textInputClass()}
      />
    </label>
  );
}

function todayYmd() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function initialValues(demo: IndustryDemo): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const section of demo.sections) {
    for (const field of section.fields) {
      if (field.type === "checkbox-group") values[field.name] = [];
      else if (field.type === "number-visitors") values[field.name] = "1";
      else if (field.type === "date" && DATE_FIELD_NAMES.has(field.name)) values[field.name] = todayYmd();
      else values[field.name] = "";
    }
  }
  return values;
}

export default function IndustryDemoForm({
  demo: demoProp,
  ownerId,
  variant = "public",
  mode = "checkin",
  onDashboardSubmit,
  onCheckInScreen,
}: IndustryDemoFormProps) {
  const isPreRegister = mode === "preregister";
  const demo = isPreRegister ? withPreregisterFields(demoProp) : demoProp;
  const isDashboard = variant === "dashboard";
  const isLiveCheckIn = Boolean(ownerId?.trim()) && !isDashboard && !isPreRegister;
  const isLivePreRegister = Boolean(ownerId?.trim()) && !isDashboard && isPreRegister;
  const showEmailOptIn = (isLiveCheckIn || isLivePreRegister) && demoHasEmailField(demo);
  const [values, setValues] = useState(() => initialValues(demo));
  const [submitted, setSubmitted] = useState(false);
  const [checkInSession, setCheckInSession] = useState<CheckInSession | null>(null);
  const [preRegisterSession, setPreRegisterSession] = useState<PreRegisterSession | null>(null);
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    onCheckInScreen?.(Boolean(submitted && (checkInSession || preRegisterSession)));
  }, [submitted, checkInSession, preRegisterSession, onCheckInScreen]);

  const handleChange = (name: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (isDashboard && onDashboardSubmit) {
        await onDashboardSubmit(values);
        setSubmitted(true);
        return;
      }

      if (isLivePreRegister) {
        const device = visitorDevicePayload();
        const res = await fetch("/api/visitors/pre-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industrySlug: demo.slug,
            ownerId: ownerId!.trim(),
            values,
            sendConfirmationEmail: showEmailOptIn ? sendConfirmationEmail : false,
            ...device,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          preRegister?: PreRegisterSession;
        };
        if (!res.ok) throw new Error(json.error ?? "Pre-registration failed.");
        if (!json.preRegister) throw new Error("Pre-registration response incomplete.");
        setPreRegisterSession(json.preRegister);
        setSubmitted(true);
        return;
      }

      if (isLiveCheckIn) {
        const res = await fetch("/api/visitors/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industrySlug: demo.slug,
            ownerId: ownerId!.trim(),
            values,
            sendConfirmationEmail: showEmailOptIn ? sendConfirmationEmail : false,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          checkIn?: CheckInSession;
        };
        if (!res.ok) throw new Error(json.error ?? "Check-in failed.");
        if (!json.checkIn) throw new Error("Check-in response incomplete.");
        setCheckInSession(json.checkIn);
        setSubmitted(true);
        return;
      }

      const res = await fetch("/api/visitors/demo-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industrySlug: demo.slug, values }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to submit demo form.");

      const previewSession = buildCheckInSessionFromForm({
        industrySlug: demo.slug,
        values,
        venueName: defaultVenueNameForDemo(demo),
      });
      if ("error" in previewSession) throw new Error(previewSession.error);
      setCheckInSession(previewSession);
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit demo form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted && preRegisterSession) {
    return (
      <VisitorPreRegisterConfirmation
        session={preRegisterSession}
        onRegisterAnother={() => {
          setSubmitted(false);
          setPreRegisterSession(null);
          setValues(initialValues(demo));
        }}
      />
    );
  }

  if (submitted && checkInSession) {
    return (
      <VisitorCheckInConfirmation
        session={checkInSession}
        onCheckOut={
          checkInSession.visitorId
            ? async () => {
                const res = await fetch(
                  `/api/visitors/${encodeURIComponent(checkInSession.visitorId)}/check-out`,
                  { method: "POST" }
                );
                const json = (await res.json().catch(() => ({}))) as { error?: string };
                if (!res.ok) throw new Error(json.error ?? "Check-out failed");
              }
            : undefined
        }
        onRegisterAnother={() => {
          setSubmitted(false);
          setCheckInSession(null);
          setValues(initialValues(demo));
        }}
      />
    );
  }

  if (submitted && isDashboard) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-secondary-200 bg-secondary-50/50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-secondary-600" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          {isDashboard ? "Visitor registered" : "Demo form submitted"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isDashboard
            ? "The visitor record was saved. You can approve the visit and issue a QR pass from the table below."
            : "Your demo submission was saved. Our team can review industry demo entries in the Fusion Xpress dashboard when the module is fully enabled."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setValues(initialValues(demo));
            }}
            className="btn-outline text-sm py-2"
          >
            {isDashboard ? "Register another" : "Try again"}
          </button>
          {!isDashboard ? (
            <Link href="/fusion-xpress/smart-visitor-management" className="btn-primary text-sm py-2">
              Back to Smart Visitor Management
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-10 overflow-visible ${isDashboard ? "max-w-2xl" : "mx-auto max-w-lg"}`}
    >
      {demo.sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-5 overflow-visible">
          {section.title ? (
            <h2
              className={`py-1 text-lg font-bold leading-snug text-gray-900 ${
                isPreRegister ? "text-left" : "text-center"
              }`}
            >
              {section.title}
            </h2>
          ) : null}
          {section.fields.map((field) => (
            <FieldControl
              key={field.name}
              field={field}
              value={values[field.name] ?? (field.type === "checkbox-group" ? [] : "")}
              onChange={handleChange}
            />
          ))}
        </div>
      ))}

      {submitError ? (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {submitError}
        </p>
      ) : null}

      {showEmailOptIn ? (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={sendConfirmationEmail}
            onChange={(e) => setSendConfirmationEmail(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          I would like a confirmation email
        </label>
      ) : null}

      {!isLiveCheckIn && !isLivePreRegister && !ownerId && !isDashboard ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Use your business pre-registration link from the dashboard to save visitors and verify them
          with a QR scan on arrival.
        </p>
      ) : null}

      {isLivePreRegister ? (
        <p className="rounded-lg border border-primary-100 bg-primary-50 px-3 py-2 text-xs text-primary-900">
          This phone and the contact number you enter will be used to verify your QR scan when you
          arrive.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 text-sm font-bold disabled:opacity-60"
        >
          {submitting
            ? "Please wait…"
            : isDashboard
              ? "Save visitor"
              : isPreRegister
                ? "Pre-register"
                : "Check In"}
        </button>
      </div>
      {!isDashboard ? (
        <p className={`text-xs text-gray-500 ${isPreRegister ? "text-left" : "text-center"}`}>
          Fusion Xpress · Changer Fusions
        </p>
      ) : null}
    </form>
  );
}
