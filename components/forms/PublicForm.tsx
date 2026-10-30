"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import {
  isPlausibleFormEmail,
  isPlausibleFormPhone,
  type FusionFormField,
} from "@/lib/fusion-forms";

const inputClass =
  "mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-secondary-700 focus:ring-2 focus:ring-secondary-700/20 sm:text-sm";

type Props = {
  slug: string;
  fields: FusionFormField[];
};

export default function PublicForm({ slug, fields }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const answers: Record<string, string> = {};
    for (const field of fields) {
      if (field.type === "checkbox") {
        answers[field.id] = data.get(field.id) === "yes" ? "yes" : "";
        if (field.required && !answers[field.id]) {
          setError(`${field.label} is required.`);
          return;
        }
        continue;
      }
      const value = String(data.get(field.id) ?? "").trim();
      answers[field.id] = value;
      if (field.required && !value) {
        setError(`${field.label} is required.`);
        return;
      }
      if (field.type === "email" && value && !isPlausibleFormEmail(value)) {
        setError(`Enter a valid email for ${field.label}.`);
        return;
      }
      if (field.type === "phone" && value && !isPlausibleFormPhone(value)) {
        setError(`Enter a valid phone number for ${field.label}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/forms/${encodeURIComponent(slug)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; submissionCode?: string };
      if (!res.ok || !json.submissionCode) throw new Error(json.error || "Could not submit this form.");
      setCode(json.submissionCode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not submit this form.");
    } finally {
      setSubmitting(false);
    }
  }

  if (fields.length === 0) {
    return (
      <p className="rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-600 shadow-sm">
        This form is not open for responses yet.
      </p>
    );
  }

  if (code) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center shadow-sm sm:px-8">
        <h2 className="text-xl font-bold text-gray-900">Response received</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">Your reference number is</p>
        <p className="mt-2 text-lg font-bold tracking-wide text-secondary-800">{code}</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Changer Fusions will use the details you provided if a reply is needed.
        </p>
        <Link
          href="/forms"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-secondary-700 px-5 text-sm font-bold text-white hover:bg-secondary-800"
        >
          Back to forms
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="space-y-5">
        {fields.map((field) => (
          <div key={field.id}>
            {field.type === "checkbox" ? (
              <label className="flex items-start gap-2.5 text-sm text-gray-800">
                <input
                  name={field.id}
                  type="checkbox"
                  value="yes"
                  required={field.required}
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <span>
                  {field.label}
                  {field.required ? <span className="text-negative"> *</span> : null}
                </span>
              </label>
            ) : (
              <>
                <label htmlFor={field.id} className="block text-sm font-semibold text-gray-900">
                  {field.label}
                  {field.required ? <span className="text-negative"> *</span> : null}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={field.id}
                    name={field.id}
                    required={field.required}
                    rows={5}
                    placeholder={field.placeholder || undefined}
                    className={inputClass}
                  />
                ) : field.type === "select" ? (
                  <select id={field.id} name={field.id} required={field.required} defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      {field.placeholder || "Choose one"}
                    </option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                    required={field.required}
                    placeholder={field.placeholder || undefined}
                    className={inputClass}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-negative">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-700 px-4 text-sm font-bold text-white hover:bg-secondary-800 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
