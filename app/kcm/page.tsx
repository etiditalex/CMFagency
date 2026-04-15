"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";

import { KCM_REGISTRATION_FEE_DEFAULT_KES } from "@/lib/kcm-registration-fee";

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
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentPromptSent, setPaymentPromptSent] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [feeKes, setFeeKes] = useState(KCM_REGISTRATION_FEE_DEFAULT_KES);

  useEffect(() => {
    void fetch("/api/kcm-membership/registration-fee", { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((j: { registration_fee_kes?: number }) => {
        if (typeof j.registration_fee_kes === "number" && j.registration_fee_kes >= 1) {
          setFeeKes(j.registration_fee_kes);
        }
      })
      .catch(() => {
        // Keep default fee if the settings table is not migrated yet.
      });
  }, []);

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

  useEffect(() => {
    if (!isRegisterModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isRegisterModalOpen]);

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
      setError(`Complete the KES ${feeKes.toLocaleString()} payment step before submitting.`);
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
    <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-0">
      <section className="relative mt-20 h-[48vh] min-h-[300px] overflow-hidden border-y border-primary-300/50 bg-primary-950 md:mt-24 md:h-[56vh] md:min-h-[390px]">
        <Image
          src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1776151059/models_wjrxfw.jpg"
          alt="Kenya Coast Models hero background"
          fill
          priority
          className="object-cover object-[center_28%]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-950/95 via-primary-900/82 via-45% to-primary-900/18" />
        <div className="absolute inset-y-0 left-0 w-[56%] bg-gradient-to-r from-primary-950/88 to-transparent md:w-[52%]" />
        <div className="absolute inset-0 flex items-center">
          <div className="container-custom w-full">
            <div className="max-w-3xl text-white">
              <h1 className="max-w-2xl text-left text-2xl font-extrabold leading-[1.08] tracking-tight sm:text-3xl md:text-5xl">
                Kenya Coast Models Membership
              </h1>
              <p className="mt-2 max-w-2xl text-left text-xs leading-relaxed text-white/90 sm:mt-3 sm:text-sm md:mt-4 md:text-[1.12rem] md:leading-relaxed">
                Kenya Coast Models is a dynamic platform designed to unify and manage models across
                the coastal region by providing a centralized space for registration and membership.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary-600 py-10 md:py-20">
        <div className="container-custom">
          <div className="grid items-center gap-5 lg:grid-cols-2 lg:gap-8">
            <div className="overflow-hidden rounded-xl border border-white/25 bg-white/10">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1776152776/kcm_c4wxka.jpg"
                  alt="Kenya Coast Models community"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>

            <div className="text-white">
              <h2 className="text-left text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">
                Why Become a member?
              </h2>
              <p className="mt-3 text-left text-sm leading-relaxed text-white/95 sm:text-base md:mt-4 md:text-lg">
                Kenya Coast Models is a dynamic platform designed to unify and manage models across
                the coastal region by providing a centralized space for registration and membership.
                Through this platform, aspiring and professional models can easily join a growing
                network that connects them to exclusive, untapped opportunities within the fashion
                and creative industry. By becoming a member, models gain visibility, credibility,
                and access to curated gigs, events, and collaborations, empowering them to grow
                their careers and unlock their full potential in a competitive market.
              </p>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-secondary-700 transition hover:bg-primary-50 sm:mt-6 sm:w-auto"
              >
                Register now
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary-50 py-10 md:py-16">
        <div className="container-custom">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-primary-900 sm:text-3xl md:text-4xl">
              Kenya Coast Models Highlights
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:mt-8 md:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-primary-200 bg-white p-6 text-center shadow-sm">
              <p className="text-5xl font-bold leading-none text-primary-200">01</p>
              <h3 className="mt-3 text-2xl font-extrabold text-secondary-700">
                Profile Visibility
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Get listed in a centralized talent network that helps casting teams and partners
                discover verified models faster.
              </p>
            </article>

            <article className="rounded-xl border border-primary-200 bg-white p-6 text-center shadow-sm">
              <p className="text-5xl font-bold leading-none text-primary-200">02</p>
              <h3 className="mt-3 text-2xl font-extrabold text-secondary-700">
                Access to Opportunities
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Receive access to curated gigs, auditions, and campaign opportunities connected to
                fashion, events, and creative activations.
              </p>
            </article>

            <article className="rounded-xl border border-primary-200 bg-white p-6 text-center shadow-sm">
              <p className="text-5xl font-bold leading-none text-primary-200">03</p>
              <h3 className="mt-3 text-2xl font-extrabold text-secondary-700">
                Credibility Boost
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Build trust with event organizers and brands through structured membership and a
                professional representation standard.
              </p>
            </article>

            <article className="rounded-xl border border-primary-200 bg-white p-6 text-center shadow-sm">
              <p className="text-5xl font-bold leading-none text-primary-200">04</p>
              <h3 className="mt-3 text-2xl font-extrabold text-secondary-700">
                Career Growth
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                Grow your potential through ongoing exposure, collaborations, and real project
                experience in a competitive market.
              </p>
            </article>
          </div>

          <div className="relative left-1/2 right-1/2 mt-32 w-screen -translate-x-1/2 md:mt-72">
            <div className="relative">
              <div className="relative h-[240px] w-full overflow-hidden sm:h-[280px] md:h-[430px]">
                <Image
                  src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1776166126/models3_prjvhc.jpg"
                  alt="Kenya Coast Models runway showcase"
                  fill
                  className="object-cover object-[center_10%]"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary-950/40 via-primary-900/15 to-primary-950/70" />
              </div>

              <div className="relative z-10 mx-3 -mt-14 sm:mx-4 sm:-mt-16 md:absolute md:left-1/2 md:top-0 md:mx-0 md:w-[min(88%,1180px)] md:-translate-x-1/2 md:-translate-y-1/2">
                <article className="overflow-hidden rounded-2xl border border-white/20 bg-secondary-600 text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
                  <div className="grid md:grid-cols-[1.1fr_1.25fr]">
                    <div className="bg-secondary-600 p-4 md:p-5">
                      <div className="relative min-h-[180px] overflow-hidden rounded-xl border border-white/15 sm:min-h-[210px] md:min-h-[245px]">
                        <Image
                          src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1776166126/models2_zb5yfj.jpg"
                          alt="KCM model community moments"
                          fill
                          className="object-cover object-[center_12%]"
                          sizes="(max-width: 768px) 100vw, 44vw"
                        />
                      </div>
                    </div>
                    <div className="p-4 md:p-8">
                      <h3 className="text-left text-xl font-extrabold leading-tight sm:text-2xl md:text-[2.05rem]">
                        Join Our Kenya-Coast Model Community
                      </h3>
                      <p className="mt-3 text-left text-sm leading-relaxed text-white/95 md:text-lg md:leading-snug">
                        Be part of Kenya-Coast models&apos; growing network, built to connect emerging
                        and professional coastal talent with trusted opportunities and visibility.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-white/80 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:w-auto md:text-base"
                      >
                        Join KCM Community
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/55 p-3 pt-20 sm:items-center sm:p-4">
          <div className="absolute inset-0" onClick={() => setIsRegisterModalOpen(false)} />
          <div className="relative z-[71] my-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-6 md:p-8">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute right-3 top-3 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Close
            </button>

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
                  setIsRegisterModalOpen(false);
                }}
                className="mt-5 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Register another model
              </button>
              <div className="mt-3">
                <Link
                  href="/kcm/member-portal"
                  className="inline-flex rounded-lg border border-primary-600 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
                >
                  Open member portal
                </Link>
              </div>
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
                    To proceed with membership, initiate payment of{" "}
                    <span className="font-semibold">KES {feeKes.toLocaleString()}</span>.
                  </p>
                  {!paymentPromptSent ? (
                    <button
                      type="button"
                      onClick={initiatePaymentPrompt}
                      disabled={paymentLoading}
                      className="mt-3 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {paymentLoading ? "Starting M-Pesa..." : `Pay KES ${feeKes.toLocaleString()} via M-Pesa`}
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
        </div>
      )}
    </main>
  );
}
