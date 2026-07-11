"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  Phone,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import { MODEL_NOMINATION_CATEGORIES } from "@/lib/model-nominations";

const HERO_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1776166126/models2_zb5yfj.jpg";

const CTA_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1776151059/models_wjrxfw.jpg";

const categories = [
  { title: "Top 10 Male Models", stars: 5 },
  { title: "Top 10 Female Models", stars: 5 },
];

const rules = [
  {
    icon: Users,
    title: "Nominate someone, not yourself",
    body: "Someone must nominate you. Self-nominations are not accepted.",
  },
  {
    icon: CheckCircle2,
    title: "Recognized on event day",
    body: "Top 10 Male and Top 10 Female Models will be recognized and certified on event day.",
  },
];

const eventDetails = [
  {
    icon: Calendar,
    label: "Date",
    value: "Saturday 15th August 2026",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "City Blue Creekside Hotel, Mombasa",
  },
  {
    icon: Clock,
    label: "Time",
    value: "From 7PM till late",
  },
];

const emptyForm = {
  nominee_name: "",
  nominee_email: "",
  nominee_phone: "",
  nominee_instagram: "",
  category: "",
  reason: "",
  confirm_not_self: false,
};

const fieldClass =
  "w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500";

export default function NominateModelPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openForm = () => {
    setSubmitted(false);
    setSubmitError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setSubmitError(null);
  };

  useEffect(() => {
    if (!formOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFormOpen(false);
        setSubmitError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [formOpen]);

  const updateField = (key: keyof typeof emptyForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/nominations/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit nomination. Please try again.");
      }
      setSubmitted(true);
      setForm(emptyForm);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50 overflow-x-hidden">
      <nav
        aria-label="Breadcrumb"
        className="container-custom pt-3 pb-2 text-xs sm:text-sm text-gray-600"
      >
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <li>
            <Link href="/" className="hover:text-primary-600 transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">
            /
          </li>
          <li>
            <Link
              href="/events"
              className="hover:text-primary-600 transition-colors"
            >
              Events
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">
            /
          </li>
          <li>
            <Link
              href="/events/upcoming"
              className="hover:text-primary-600 transition-colors"
            >
              Upcoming
            </Link>
          </li>
          <li aria-hidden className="text-gray-400">
            /
          </li>
          <li className="font-semibold text-gray-900" aria-current="page">
            Nominate a Model
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[340px] sm:min-h-[420px] md:min-h-[520px] flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Nominate a model for Coast Fashion and Modelling Awards 2026 runway show in Mombasa Kenya"
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-primary-950/65" aria-hidden />
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary-900/25 via-transparent to-primary-950/35"
            aria-hidden
          />
        </div>

        <div
          className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 sm:h-56 sm:w-56 md:h-72 md:w-72 rounded-full opacity-80 sm:opacity-90"
          style={{
            background:
              "linear-gradient(135deg, #1d8a63 0%, #1e58ca 55%, #0f2f64 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/2 right-[12%] sm:right-[18%] hidden sm:block h-10 w-10 md:h-14 md:w-14 -translate-y-8 rounded-full opacity-95"
          style={{
            background: "linear-gradient(135deg, #2ca57c 0%, #1e58ca 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -right-8 h-36 w-36 sm:h-48 sm:w-48 md:h-64 md:w-64 rounded-full opacity-75 sm:opacity-85"
          style={{
            background:
              "linear-gradient(145deg, #1d8a63 0%, #3b79da 45%, #0f2f64 100%)",
          }}
          aria-hidden
        />

        <div className="container-custom relative z-10 px-4 py-12 sm:py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="w-full max-w-3xl mx-auto"
          >
            <h1 className="font-montserrat text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-2xl leading-tight">
              Nominate a Model
            </h1>
            <div className="mt-5 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4">
              <span
                className="h-px w-8 sm:w-12 md:w-16 bg-secondary-400"
                aria-hidden
              />
              <p className="text-sm sm:text-base md:text-lg font-medium tracking-[0.18em] sm:tracking-[0.2em] text-white/95 uppercase">
                CFMA 2026
              </p>
              <span
                className="h-px w-8 sm:w-12 md:w-16 bg-secondary-400"
                aria-hidden
              />
            </div>
            <div className="mt-7 sm:mt-8 flex justify-center">
              <button
                type="button"
                onClick={openForm}
                className="inline-flex min-h-[44px] w-full max-w-xs sm:w-auto items-center justify-center rounded-full bg-secondary-600 hover:bg-secondary-500 text-white font-bold tracking-wide uppercase text-sm px-8 py-3.5 shadow-lg transition-colors"
              >
                Nominate Now
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to nominate */}
      <section className="relative bg-white py-12 sm:py-16 md:py-24 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #1e58ca 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="container-custom relative max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="font-montserrat text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900">
              Call to <span className="text-primary-600">Nominate</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto text-justify sm:text-center">
              Let&apos;s recognize and celebrate the best modeling talent in
              Coast. Nominate{" "}
              <strong className="font-semibold text-gray-800">
                Top 10 Male Models
              </strong>{" "}
              and{" "}
              <strong className="font-semibold text-gray-800">
                Top 10 Female Models
              </strong>{" "}
              for the{" "}
              <Link
                href="/events/upcoming/coast-fashion-modelling-awards-2026"
                className="text-primary-600 font-semibold hover:underline"
              >
                Coast Fashion &amp; Modelling Awards 2026
              </Link>{" "}
              in Mombasa.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-gray-50 py-10 sm:py-14 md:py-16">
        <div className="container-custom max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6"
          >
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="border-2 border-primary-600 bg-white px-4 sm:px-6 py-6 sm:py-8 text-center"
              >
                <h3 className="font-montserrat text-base sm:text-lg md:text-xl font-extrabold tracking-wide text-primary-700 uppercase">
                  {cat.title}
                </h3>
                <div
                  className="mt-3 sm:mt-4 flex items-center justify-center gap-1.5"
                  aria-label="Five stars"
                >
                  {Array.from({ length: cat.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 sm:w-5 sm:h-5 fill-secondary-500 text-secondary-500"
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-4 sm:mt-6 bg-primary-600 text-white text-center px-3 sm:px-4 py-3 sm:py-3.5"
          >
            <p className="font-montserrat text-xs sm:text-sm md:text-base font-bold tracking-wide uppercase leading-snug">
              To be recognized &amp; certified on event day
            </p>
          </motion.div>
        </div>
      </section>

      {/* Rules */}
      <section className="bg-white py-12 sm:py-16 md:py-24">
        <div className="container-custom max-w-4xl">
          <h2 className="font-montserrat text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-10">
            How nominations work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            {rules.map((rule, index) => {
              const Icon = rule.icon;
              return (
                <motion.div
                  key={rule.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="flex gap-3 sm:gap-4"
                >
                  <div className="shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm md:text-base">
                      {rule.title}
                    </h3>
                    <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed text-justify">
                      {rule.body}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Event details */}
      <section className="bg-primary-950 text-white py-12 sm:py-16 md:py-24">
        <div className="container-custom max-w-5xl">
          <h2 className="font-montserrat text-xs sm:text-sm font-extrabold tracking-[0.25em] sm:tracking-[0.3em] text-secondary-400 uppercase text-center mb-8 sm:mb-10">
            Event Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 md:gap-0">
            {eventDetails.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`flex flex-col items-center text-center px-4 sm:px-6 ${
                    index > 0
                      ? "sm:border-l sm:border-white/20 border-t border-white/15 sm:border-t-0 pt-6 sm:pt-0"
                      : ""
                  }`}
                >
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-secondary-400 mb-3" aria-hidden />
                  <p className="text-xs font-bold tracking-widest text-white/50 uppercase mb-2">
                    {item.label}
                  </p>
                  <p className="font-semibold text-white leading-snug text-sm sm:text-base">
                    {item.value}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — split panel; stacked image on mobile */}
      <section className="relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:min-h-[480px]">
          <div className="relative h-48 sm:h-56 md:hidden">
            <Image
              src={CTA_IMAGE}
              alt="Models on the runway at Coast Fashion event in Mombasa — nominate Top 10 models for CFMA 2026"
              fill
              className="object-cover object-center"
              sizes="100vw"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="w-full md:w-[58%] lg:w-[52%] bg-primary-950 flex items-center"
          >
            <div className="w-full px-5 py-10 sm:px-10 sm:py-14 md:px-14 lg:px-16 max-w-xl mx-auto md:mx-0">
              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <p className="text-xs sm:text-sm font-bold tracking-[0.18em] sm:tracking-[0.2em] text-white uppercase">
                  Call to Action
                </p>
                <span
                  className="h-px w-8 sm:w-10 md:w-14 bg-secondary-500"
                  aria-hidden
                />
              </div>
              <h2 className="font-montserrat text-2xl sm:text-3xl md:text-[2.75rem] font-extrabold text-white leading-tight">
                Nominate Coast&apos;s Best
              </h2>
              <p className="mt-4 sm:mt-5 text-white/90 text-sm sm:text-base md:text-lg leading-relaxed text-justify">
                Let&apos;s recognize and celebrate the best modeling talent in
                Coast. Nominate Top 10 Male and Top 10 Female Models to be
                recognized and certified at the Coast Fashion &amp; Modelling
                Awards 2026 — Saturday 15th August at City Blue Creekside Hotel,
                Mombasa.
              </p>
              <button
                type="button"
                onClick={openForm}
                className="mt-6 sm:mt-8 inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center rounded-full bg-secondary-600 hover:bg-secondary-500 text-white font-bold tracking-wide uppercase text-sm px-8 py-3.5 shadow-lg transition-colors"
              >
                Nominate Now
              </button>
            </div>
          </motion.div>

          <div className="relative hidden md:block flex-1 min-h-[480px]">
            <Image
              src={CTA_IMAGE}
              alt="Models on the runway at Coast Fashion event in Mombasa — nominate Top 10 models for CFMA 2026"
              fill
              className="object-cover object-center"
              sizes="50vw"
            />
          </div>
        </div>
      </section>

      {/* Nomination form modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nominate-form-title"
          onClick={closeForm}
        >
          <div
            className="relative w-full max-w-2xl max-h-[min(92vh,100dvh)] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start sm:items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0 pr-2">
                <h2
                  id="nominate-form-title"
                  className="font-montserrat text-base sm:text-xl font-extrabold text-gray-900"
                >
                  Submit a nomination
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-gray-500 text-justify sm:text-left">
                  Nominate someone else for Top 10 Male or Female Models.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="shrink-0 rounded-full p-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                aria-label="Close nomination form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              {submitted ? (
                <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-6 sm:p-8 text-center">
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-secondary-600 mx-auto mb-3" />
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                    Nomination received
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 text-justify sm:text-center">
                    Thank you. Our team will review your nomination for CFMA 2026.
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 transition-colors"
                    >
                      Nominate another model
                    </button>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 font-semibold px-6 py-3 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
                  <div>
                    <h3 className="text-xs sm:text-sm font-extrabold tracking-widest text-gray-500 uppercase mb-4">
                      Nominee details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominee full name *
                        </label>
                        <input
                          required
                          value={form.nominee_name}
                          onChange={(e) =>
                            updateField("nominee_name", e.target.value)
                          }
                          className={fieldClass}
                          autoComplete="name"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category *
                        </label>
                        <select
                          required
                          value={form.category}
                          onChange={(e) => updateField("category", e.target.value)}
                          className={fieldClass}
                        >
                          <option value="">Select category</option>
                          {MODEL_NOMINATION_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominee email
                        </label>
                        <input
                          type="email"
                          inputMode="email"
                          value={form.nominee_email}
                          onChange={(e) =>
                            updateField("nominee_email", e.target.value)
                          }
                          className={fieldClass}
                          autoComplete="email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominee phone
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          value={form.nominee_phone}
                          onChange={(e) =>
                            updateField("nominee_phone", e.target.value)
                          }
                          className={fieldClass}
                          autoComplete="tel"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Instagram / social handle
                        </label>
                        <input
                          value={form.nominee_instagram}
                          onChange={(e) =>
                            updateField("nominee_instagram", e.target.value)
                          }
                          placeholder="@username"
                          className={fieldClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Why are you nominating them? *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={form.reason}
                          onChange={(e) => updateField("reason", e.target.value)}
                          className={`${fieldClass} min-h-[120px] resize-y`}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 text-sm text-gray-700 text-justify">
                    <input
                      type="checkbox"
                      required
                      checked={form.confirm_not_self}
                      onChange={(e) =>
                        updateField("confirm_not_self", e.target.checked)
                      }
                      className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>
                      I confirm I am nominating someone else, not myself. *
                    </span>
                  </label>

                  {submitError && (
                    <p className="text-sm text-red-600 font-medium text-justify">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-secondary-600 hover:bg-secondary-500 disabled:opacity-60 text-white font-bold tracking-wide uppercase text-sm px-8 py-3.5 shadow-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? "Submitting…" : "Submit nomination"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      <section
        className="bg-white py-12 sm:py-16 md:py-24"
        aria-labelledby="nominate-faq-heading"
      >
        <div className="container-custom max-w-3xl">
          <h2
            id="nominate-faq-heading"
            className="font-montserrat text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-8 sm:mb-10"
          >
            Frequently asked questions
          </h2>
          <div className="space-y-5 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                How do I nominate a model for CFMA 2026?
              </h3>
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed text-justify">
                Click <strong className="font-semibold text-gray-800">Nominate Now</strong> on
                this page, then complete the online form with the nominee&apos;s
                information for Top 10 Male Models or Top 10 Female Models.
                Nominations are free and reviewed by the CMF Agency team.
              </p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Can I nominate myself?
              </h3>
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed text-justify">
                No. Someone else must nominate you. Self-nominations are not
                accepted for the Coast Fashion &amp; Modelling Awards Top 10
                categories.
              </p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                When and where is CFMA 2026?
              </h3>
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed text-justify">
                Saturday 15th August 2026 at City Blue Creekside Hotel, Mombasa,
                from 7PM till late. Top 10 Male and Top 10 Female Models will be
                recognized and certified on event day.
              </p>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                What if I want to register as a contestant instead?
              </h3>
              <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed text-justify">
                Use our{" "}
                <Link
                  href="/events/register-as-model"
                  className="text-primary-600 font-semibold hover:underline"
                >
                  Register as a Model
                </Link>{" "}
                page for CFMA award category registration, or view full{" "}
                <Link
                  href="/events/upcoming/coast-fashion-modelling-awards-2026"
                  className="text-primary-600 font-semibold hover:underline"
                >
                  CFMA 2026 event details
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className="bg-gray-900 text-white py-8 sm:py-10">
        <div className="container-custom max-w-4xl">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-10 text-sm">
            <a
              href="tel:+254797777347"
              className="inline-flex min-h-[44px] items-center gap-2 text-white/90 hover:text-secondary-300 transition-colors"
            >
              <Phone className="w-4 h-4 text-secondary-400" />
              0797 777 347
            </a>
            <a
              href="https://www.cmfagency.co.ke"
              className="inline-flex min-h-[44px] items-center gap-2 text-white/90 hover:text-secondary-300 transition-colors break-all"
            >
              <Globe className="w-4 h-4 shrink-0 text-secondary-400" />
              www.cmfagency.co.ke
            </a>
            <a
              href="https://www.instagram.com/coastfashionawards"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-2 text-white/90 hover:text-secondary-300 transition-colors"
            >
              <span className="text-secondary-400 font-bold" aria-hidden>
                @
              </span>
              coastfashionawards
            </a>
          </div>
          <p className="mt-5 sm:mt-6 text-center">
            <Link
              href="/events/upcoming"
              className="inline-flex min-h-[44px] items-center text-white/60 hover:text-white text-sm font-medium transition-colors"
            >
              ← Back to Upcoming Events
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
