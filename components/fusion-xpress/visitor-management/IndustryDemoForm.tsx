"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import type { IndustryDemo } from "@/lib/visitors/industry-demos";
import type { DemoField } from "@/lib/visitors/industry-demos";

type IndustryDemoFormProps = {
  demo: IndustryDemo;
};

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
          {field.required ? " *" : ""}
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
          {field.required ? " *" : ""}
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
        {field.required ? " *" : ""}
      </span>
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

function initialValues(demo: IndustryDemo): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const section of demo.sections) {
    for (const field of section.fields) {
      if (field.type === "checkbox-group") values[field.name] = [];
      else if (field.type === "number-visitors") values[field.name] = "1";
      else values[field.name] = "";
    }
  }
  return values;
}

export default function IndustryDemoForm({ demo }: IndustryDemoFormProps) {
  const [values, setValues] = useState(() => initialValues(demo));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (name: string, value: string | string[]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/visitors/demo-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industrySlug: demo.slug, values }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to submit demo form.");
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit demo form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-secondary-200 bg-secondary-50/50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-secondary-600" />
        <h2 className="mt-4 text-xl font-bold text-gray-900">Demo form submitted</h2>
        <p className="mt-2 text-sm text-gray-600">
          Your demo submission was saved. Our team can review industry demo entries in the Fusion
          Xpress dashboard when the module is fully enabled.
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
            Try again
          </button>
          <Link href="/fusion-xpress/smart-visitor-management" className="btn-primary text-sm py-2">
            Back to Smart Visitor Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-10 overflow-visible">
      {demo.sections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-5 overflow-visible">
          {section.title ? (
            <h2 className="py-1 text-center text-lg font-bold leading-snug text-gray-900">
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
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary flex-1 py-3 text-sm font-bold disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit demo form"}
        </button>
        <Link
          href="/contact?subject=Smart%20Visitor%20Management%20Demo"
          className="btn-outline flex-1 py-3 text-center text-sm font-bold"
        >
          Request live demo
        </Link>
      </div>
      <p className="text-center text-xs text-gray-500">
        Demo preview · Fusion Xpress · Changer Fusions
      </p>
    </form>
  );
}
