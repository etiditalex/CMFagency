"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, CreditCard } from "lucide-react";

type FormState = {
  firstName: string;
  secondName: string;
  contact: string;
  email: string;
  experience: string;
  topModelInterest: "yes" | "no" | "";
  paymentConfirmed: boolean;
};

const initialState: FormState = {
  firstName: "",
  secondName: "",
  contact: "",
  email: "",
  experience: "",
  topModelInterest: "",
  paymentConfirmed: false,
};

export default function KcmPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentPromptSent, setPaymentPromptSent] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [membershipId, setMembershipId] = useState<string | null>(null);

  useEffect(() => {
    if (!membershipId || paymentStatus !== "pending") return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/kcm-membership/payment-status?membership_id=${encodeURIComponent(membershipId)}`);
        const json = (await res.json().catch(() => ({}))) as { payment_status?: string };
        if (!res.ok) return;
        const status = String(json.payment_status ?? "pending");
        if (status === "success") {
          setPaymentStatus("success");
          setForm((prev) => ({ ...prev, paymentConfirmed: true }));
          window.clearInterval(timer);
        } else if (status === "failed") {
          setPaymentStatus("failed");
          window.clearInterval(timer);
        }
      } catch {
        // Keep polling quietly for callback completion.
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [membershipId, paymentStatus]);

  const initiatePaymentPrompt = async () => {
    setError(null);
    if (!form.contact.trim() || !form.email.trim()) {
      setError("Enter contact and email first, then initiate payment.");
      return;
    }
    setPaymentLoading(true);
    try {
      const response = await fetch("/api/kcm-membership/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: form.firstName.trim(),
          second_name: form.secondName.trim(),
          contact: form.contact.trim(),
          email: form.email.trim().toLowerCase(),
          experience: form.experience.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        membership_id?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not initiate M-Pesa payment.");
        setPaymentStatus("failed");
        return;
      }
      setPaymentPromptSent(true);
      setPaymentStatus("pending");
      setMembershipId(payload.membership_id ?? null);
    } catch {
      setError("Could not start M-Pesa payment right now.");
      setPaymentStatus("failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!form.paymentConfirmed) {
      setError("Complete the KES 50 payment step before submitting.");
      setSubmitting(false);
      return;
    }
    if (!form.topModelInterest) {
      setError("Please answer the top model recognition question.");
      setSubmitting(false);
      return;
    }
    if (!membershipId) {
      setError("Missing membership payment session. Please initiate payment again.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/kcm-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membership_id: membershipId,
          top_model_interest: form.topModelInterest === "yes",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not submit registration. Please try again.");
        return;
      }

      setSubmitted(true);
      setForm(initialState);
      setPaymentPromptSent(false);
      setPaymentStatus("idle");
      setMembershipId(null);
    } catch {
      setError("Something went wrong while sending your registration.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="relative h-[68vh] min-h-[460px] overflow-hidden pt-24 md:pt-28">
        <Image
          src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1776075185/medium-shot-young-woman-dancing1_pkc158.jpg"
          alt="Kenya Coast Models hero background"
          fill
          priority
          className="object-cover object-[center_18%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/20" />
      </section>

      <section className="container-custom py-10 md:py-12">
        <div className="grid gap-8 rounded-2xl bg-gradient-to-r from-primary-900 via-primary-700 to-secondary-700 p-6 text-white md:p-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
              Kenya Coast Models
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
              KCM Membership Registration
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/90 md:text-base">
              Join a curated network of coast-based models and access growth opportunities, visibility, and
              professional support under the Changer Fusion brand.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold">Membership overview</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/90">
              <li>Professional profile inclusion for KCM opportunities.</li>
              <li>Access to auditions, campaigns, and selected model showcases.</li>
              <li>One-time registration payment: <span className="font-semibold">KES 50</span>.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="container-custom py-12 md:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          {submitted ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
              <h2 className="mt-3 text-2xl font-bold text-green-900">Registration received</h2>
              <p className="mt-2 text-sm text-green-800">
                Thank you for applying to KCM. Our team will contact you after validating your details and payment.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setForm(initialState);
                  setError(null);
                  setPaymentPromptSent(false);
                  setPaymentLoading(false);
                  setPaymentStatus("idle");
                  setMembershipId(null);
                }}
                className="mt-5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Register another model
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Model details</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Fill in your information below to complete your KCM membership request.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-gray-700">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label htmlFor="secondName" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Second Name
                    </label>
                    <input
                      id="secondName"
                      type="text"
                      required
                      value={form.secondName}
                      onChange={(e) => setForm((prev) => ({ ...prev, secondName: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                      placeholder="Enter second name"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="contact" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Contact
                    </label>
                    <input
                      id="contact"
                      type="tel"
                      required
                      value={form.contact}
                      onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                      placeholder="e.g. 07XX XXX XXX"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="experience" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Experience
                  </label>
                  <textarea
                    id="experience"
                    required
                    value={form.experience}
                    onChange={(e) => setForm((prev) => ({ ...prev, experience: e.target.value }))}
                    className="min-h-28 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                    placeholder="Briefly describe your modeling experience."
                  />
                </div>

                <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary-900">
                    <CreditCard className="h-4 w-4" />
                    Payment step
                  </p>
                  <p className="mt-1 text-sm text-primary-800">
                    To proceed with membership, initiate payment of <span className="font-semibold">KES 50</span>.
                  </p>
                  {!paymentPromptSent ? (
                    <button
                      type="button"
                      onClick={initiatePaymentPrompt}
                      disabled={paymentLoading}
                      className="mt-3 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {paymentLoading ? "Starting M-Pesa..." : "Pay KES 50 via M-Pesa"}
                    </button>
                  ) : (
                    <>
                      <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                        Payment prompt initiated. Complete on your phone to continue.
                      </p>
                      <div className="mt-3 text-xs text-primary-900">
                        {paymentStatus === "pending" && "Waiting for M-Pesa confirmation..."}
                        {paymentStatus === "success" && "Payment confirmed successfully."}
                        {paymentStatus === "failed" && "Payment failed or cancelled. Retry payment below."}
                      </div>
                      {paymentStatus === "failed" && (
                        <button
                          type="button"
                          onClick={initiatePaymentPrompt}
                          disabled={paymentLoading}
                          className="mt-3 inline-flex items-center rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Retry M-Pesa prompt
                        </button>
                      )}
                    </>
                  )}
                </div>

                {form.paymentConfirmed && (
                  <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
                    <legend className="px-1 text-sm font-semibold text-gray-900">
                      Are you interested to be recognized as the top model in the coast?
                    </legend>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="topModelInterest"
                        value="yes"
                        required
                        checked={form.topModelInterest === "yes"}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            topModelInterest: e.target.value as "yes",
                          }))
                        }
                        className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Yes, I am interested.
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="topModelInterest"
                        value="no"
                        required
                        checked={form.topModelInterest === "no"}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            topModelInterest: e.target.value as "no",
                          }))
                        }
                        className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      Not at the moment.
                    </label>
                  </fieldset>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Submitting..." : "Submit KCM Membership"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
