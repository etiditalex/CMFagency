"use client";

import { useState } from "react";
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
} from "lucide-react";
import { MODEL_NOMINATION_CATEGORIES } from "@/lib/model-nominations";

const HERO_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1776166126/models2_zb5yfj.jpg";

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
  nominator_name: "",
  nominator_email: "",
  nominator_phone: "",
  nominee_name: "",
  nominee_email: "",
  nominee_phone: "",
  nominee_instagram: "",
  category: "",
  reason: "",
  confirm_not_self: false,
};

export default function NominateModelPage() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero — Award Categories structure, CMF palette */}
      <section className="relative overflow-hidden min-h-[420px] md:min-h-[520px] flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Coast Fashion and Modelling Awards"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-primary-950/65" aria-hidden />
          <div
            className="absolute inset-0 bg-gradient-to-b from-primary-900/25 via-transparent to-primary-950/35"
            aria-hidden
          />
        </div>

        {/* Decorative gradient circles */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 md:h-72 md:w-72 rounded-full opacity-90"
          style={{
            background:
              "linear-gradient(135deg, #1d8a63 0%, #1e58ca 55%, #0f2f64 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/2 right-[18%] h-10 w-10 md:h-14 md:w-14 -translate-y-8 rounded-full opacity-95"
          style={{
            background: "linear-gradient(135deg, #2ca57c 0%, #1e58ca 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 md:h-64 md:w-64 rounded-full opacity-85"
          style={{
            background:
              "linear-gradient(145deg, #1d8a63 0%, #3b79da 45%, #0f2f64 100%)",
          }}
          aria-hidden
        />

        <div className="container-custom relative z-10 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <h1 className="font-montserrat text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-2xl">
              Nominate Model
            </h1>
            <div className="mt-6 flex items-center justify-center gap-4">
              <span
                className="h-px w-12 sm:w-16 bg-secondary-400"
                aria-hidden
              />
              <p className="text-base sm:text-lg font-medium tracking-[0.2em] text-white/95 uppercase">
                2026
              </p>
              <span
                className="h-px w-12 sm:w-16 bg-secondary-400"
                aria-hidden
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Call to nominate */}
      <section className="relative bg-white section-padding overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #1e58ca 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div className="container-custom relative max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-montserrat text-3xl md:text-5xl font-extrabold text-gray-900">
              Call to{" "}
              <span className="text-primary-600">Nominate</span>
            </h2>
            <p className="mt-4 text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Let&apos;s recognize and celebrate the best modeling talent in Coast.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-gray-50 section-padding pt-0">
        <div className="container-custom max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6"
          >
            {categories.map((cat) => (
              <div
                key={cat.title}
                className="border-2 border-primary-600 bg-white px-6 py-8 text-center"
              >
                <h3 className="font-montserrat text-lg md:text-xl font-extrabold tracking-wide text-primary-700 uppercase">
                  {cat.title}
                </h3>
                <div
                  className="mt-4 flex items-center justify-center gap-1.5"
                  aria-label="Five stars"
                >
                  {Array.from({ length: cat.stars }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-secondary-500 text-secondary-500"
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
            className="mt-6 bg-primary-600 text-white text-center px-4 py-3.5"
          >
            <p className="font-montserrat text-sm md:text-base font-bold tracking-wide uppercase">
              To be recognized &amp; certified on event day
            </p>
          </motion.div>
        </div>
      </section>

      {/* Rules */}
      <section className="bg-white section-padding">
        <div className="container-custom max-w-4xl">
          <h2 className="font-montserrat text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-10">
            How nominations work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {rules.map((rule, index) => {
              const Icon = rule.icon;
              return (
                <motion.div
                  key={rule.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                    <Icon className="w-6 h-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 uppercase tracking-wide text-sm md:text-base">
                      {rule.title}
                    </h3>
                    <p className="mt-2 text-gray-600 leading-relaxed">
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
      <section className="bg-primary-950 text-white section-padding">
        <div className="container-custom max-w-5xl">
          <h2 className="font-montserrat text-sm font-extrabold tracking-[0.3em] text-secondary-400 uppercase text-center mb-10">
            Event Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
            {eventDetails.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`flex flex-col items-center text-center px-6 ${
                    index > 0
                      ? "md:border-l md:border-white/20"
                      : ""
                  }`}
                >
                  <Icon className="w-7 h-7 text-secondary-400 mb-3" aria-hidden />
                  <p className="text-xs font-bold tracking-widest text-white/50 uppercase mb-2">
                    {item.label}
                  </p>
                  <p className="font-semibold text-white leading-snug">
                    {item.value}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — split panel with centered image on the right */}
      <section className="relative overflow-hidden min-h-[420px] md:min-h-[480px]">
        <div className="relative z-10 flex min-h-[420px] md:min-h-[480px]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="w-full md:w-[58%] lg:w-[52%] bg-primary-950 flex items-center"
          >
            <div className="px-8 py-14 sm:px-12 md:px-14 lg:px-16 max-w-xl">
              <div className="flex items-center gap-3 mb-5">
                <p className="text-xs sm:text-sm font-bold tracking-[0.2em] text-white uppercase">
                  Call to Action
                </p>
                <span
                  className="h-px w-10 sm:w-14 bg-secondary-500"
                  aria-hidden
                />
              </div>
              <h2 className="font-montserrat text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-white leading-tight">
                Nominate Coast&apos;s Best
              </h2>
              <p className="mt-5 text-white/90 text-base md:text-lg leading-relaxed">
                Let&apos;s recognize and celebrate the best modeling talent in
                Coast. Nominate Top 10 Male and Top 10 Female Models to be
                recognized and certified at the Coast Fashion &amp; Modelling
                Awards 2026 — Saturday 15th August at City Blue Creekside Hotel,
                Mombasa.
              </p>
              <a
                href="#nominate-form"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-secondary-600 hover:bg-secondary-500 text-white font-bold tracking-wide uppercase text-sm px-8 py-3.5 shadow-lg transition-colors"
              >
                Nominate Now
              </a>
            </div>
          </motion.div>

          <div className="relative hidden md:block flex-1 min-h-[480px]">
            <Image
              src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1776151059/models_wjrxfw.jpg"
              alt="Models on the runway at a Coast fashion event"
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 0vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Nomination form */}
      <section id="nominate-form" className="bg-gray-50 section-padding scroll-mt-28">
        <div className="container-custom max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-montserrat text-3xl md:text-4xl font-extrabold text-gray-900">
              Submit a nomination
            </h2>
            <p className="mt-3 text-gray-600">
              Nominate someone else for Top 10 Male or Top 10 Female Models. Your
              submission appears instantly in Fusion Xpress.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border border-secondary-200 bg-secondary-50 p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-secondary-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900">Nomination received</h3>
              <p className="mt-2 text-gray-600">
                Thank you. Our team will review your nomination for CFMA 2026.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 transition-colors"
              >
                Nominate another model
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-8"
            >
              <div>
                <h3 className="text-sm font-extrabold tracking-widest text-gray-500 uppercase mb-4">
                  Your details (nominator)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full name *
                    </label>
                    <input
                      required
                      value={form.nominator_name}
                      onChange={(e) => updateField("nominator_name", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={form.nominator_email}
                      onChange={(e) => updateField("nominator_email", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      value={form.nominator_phone}
                      onChange={(e) => updateField("nominator_phone", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-extrabold tracking-widest text-gray-500 uppercase mb-4">
                  Nominee details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nominee full name *
                    </label>
                    <input
                      required
                      value={form.nominee_name}
                      onChange={(e) => updateField("nominee_name", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      value={form.nominee_email}
                      onChange={(e) => updateField("nominee_email", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nominee phone
                    </label>
                    <input
                      value={form.nominee_phone}
                      onChange={(e) => updateField("nominee_phone", e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram / social handle
                    </label>
                    <input
                      value={form.nominee_instagram}
                      onChange={(e) => updateField("nominee_instagram", e.target.value)}
                      placeholder="@username"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  required
                  checked={form.confirm_not_self}
                  onChange={(e) => updateField("confirm_not_self", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  I confirm I am nominating someone else, not myself. *
                </span>
              </label>

              {submitError && (
                <p className="text-sm text-red-600 font-medium">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-secondary-600 hover:bg-secondary-500 disabled:opacity-60 text-white font-bold tracking-wide uppercase text-sm px-8 py-3.5 shadow-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Submitting…" : "Submit nomination"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Contact strip */}
      <section className="bg-gray-900 text-white py-10">
        <div className="container-custom max-w-4xl">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm">
            <a
              href="tel:+254797777347"
              className="inline-flex items-center gap-2 text-white/90 hover:text-secondary-300 transition-colors"
            >
              <Phone className="w-4 h-4 text-secondary-400" />
              0797 777 347
            </a>
            <a
              href="https://www.cmfagency.co.ke"
              className="inline-flex items-center gap-2 text-white/90 hover:text-secondary-300 transition-colors"
            >
              <Globe className="w-4 h-4 text-secondary-400" />
              www.cmfagency.co.ke
            </a>
            <a
              href="https://www.instagram.com/coastfashionawards"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/90 hover:text-secondary-300 transition-colors"
            >
              <span className="text-secondary-400 font-bold" aria-hidden>
                @
              </span>
              coastfashionawards
            </a>
          </div>
          <p className="mt-6 text-center">
            <Link
              href="/events/upcoming"
              className="text-white/60 hover:text-white text-sm font-medium transition-colors"
            >
              ← Back to Upcoming Events
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
