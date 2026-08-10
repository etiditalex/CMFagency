"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Eye, Phone } from "lucide-react";

const PHONE_DISPLAY = "+254 797 777347";
const PHONE_HREF = "tel:+254797777347";
const WHATSAPP_NUMBER = "254797777347";

const DEPARTMENTS = [
  "Attachments",
  "Internships",
  "Jobs",
  "Career Development",
  "General Inquiry",
] as const;

const BG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360469/careers_mtyoxg.jpg";

/** Kenyan coastal strip silhouette (same outline used on voting / CMFA dotted maps). */
const COAST_PATH =
  "M72,4 L62,22 L52,40 L40,58 L28,76 L16,92 L4,86 L14,68 L26,50 L38,32 L48,16 L58,2 Z";

function SideCoastDotMap({
  id,
  className,
}: {
  id: string;
  className: string;
}) {
  const patternId = `careers-coast-dots-${id}`;
  const pitch = 3.2;
  const radius = 0.95;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={`pointer-events-none absolute ${className}`}
      aria-hidden
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
          <circle cx={pitch / 2} cy={pitch / 2} r={radius} fill="#ffffff" />
        </pattern>
      </defs>
      <path d={COAST_PATH} fill={`url(#${patternId})`} />
    </svg>
  );
}

export default function CareersContactSection() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    department: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [siteViews, setSiteViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/site-views", { method: "GET", credentials: "same-origin" });
        const data = (await res.json().catch(() => ({}))) as { total?: number | null };
        if (!cancelled && typeof data.total === "number" && Number.isFinite(data.total)) {
          setSiteViews(data.total);
        }
      } catch {
        // Leave views unset if the counter is not configured yet.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const subject = formData.department
        ? `Careers — ${formData.department}`
        : "Careers inquiry";

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: "",
          subject,
          message: formData.message,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to send message. Please try again.");
      }

      const whatsappMessage = `*New careers inquiry*

*Name:* ${formData.name}
*Email:* ${formData.email}
*Department:* ${formData.department || "Not selected"}

*Message:*
${formData.message}`;

      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`,
        "_blank"
      );

      setSubmitted(true);
      setFormData({ email: "", name: "", department: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClassName =
    "w-full rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30";

  return (
    <section
      className="careers-contact relative w-full overflow-hidden py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="careers-contact-heading"
    >
      <div className="absolute inset-0">
        <Image
          src={BG_IMAGE}
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(10,31,66,0.72) 0%, rgba(30,88,202,0.55) 45%, rgba(29,138,99,0.5) 100%)",
          }}
        />

        {/* Bold dotted coast maps — sides only on sm+; keep mobile card uncluttered */}
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[22%] max-w-[220px] overflow-hidden sm:block sm:w-[26%] sm:max-w-[280px] lg:max-w-[320px]">
          <SideCoastDotMap
            id="left"
            className="-left-[15%] top-1/2 h-[140%] w-[140%] -translate-y-1/2 opacity-80"
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[22%] max-w-[220px] overflow-hidden sm:block sm:w-[26%] sm:max-w-[280px] lg:max-w-[320px]">
          <SideCoastDotMap
            id="right"
            className="-right-[15%] top-1/2 h-[140%] w-[140%] -translate-y-1/2 scale-x-[-1] opacity-80"
          />
        </div>
      </div>

      {/* Site views — bottom-left over dotted coast area (outside the white card) */}
      {siteViews != null ? (
        <div className="pointer-events-none absolute bottom-4 left-3 z-20 sm:bottom-6 sm:left-5 md:bottom-8 md:left-8 lg:bottom-10 lg:left-10">
          <div
            className="inline-flex items-center gap-2.5 rounded-lg bg-black/25 px-3 py-2 backdrop-blur-[2px] sm:gap-3 sm:px-3.5 sm:py-2.5"
            aria-label={`${siteViews.toLocaleString("en-KE")} total site views`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/35 sm:h-10 sm:w-10">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </span>
            <span className="!text-left text-white">
              <span className="block text-base font-bold tabular-nums leading-none sm:text-lg">
                {siteViews.toLocaleString("en-KE")}
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 sm:text-xs">
                Site views
              </span>
            </span>
          </div>
        </div>
      ) : null}

      <div className="relative w-full px-3 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl sm:rounded-2xl lg:rounded-3xl"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="flex flex-col justify-center px-4 py-7 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
              <h2
                id="careers-contact-heading"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Having any trouble?
              </h2>
              <p className="!text-left mt-2 text-sm text-gray-600 sm:mt-3 sm:text-lg">
                Do not hesitate to reach out to us anytime.
              </p>

              <a
                href={PHONE_HREF}
                className="mt-6 inline-flex min-h-[48px] items-center gap-3 self-start transition-opacity hover:opacity-90 sm:mt-8 sm:gap-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-md sm:h-14 sm:w-14">
                  <Phone className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                </span>
                <span className="text-base font-bold text-gray-900 sm:text-xl">
                  {PHONE_DISPLAY}
                </span>
              </a>
            </div>

            <div className="border-t border-gray-100 px-4 py-7 sm:px-8 sm:py-10 lg:border-l lg:border-t-0 lg:px-10 lg:py-12">
              <form onSubmit={handleSubmit} className="flex h-full flex-col gap-3 sm:gap-3.5">
                <label className="sr-only" htmlFor="careers-contact-email">
                  Your e-mail address
                </label>
                <input
                  id="careers-contact-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Your e-mail address"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className={fieldClassName}
                />
                <label className="sr-only" htmlFor="careers-contact-name">
                  Your full name
                </label>
                <input
                  id="careers-contact-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className={fieldClassName}
                />
                <label className="sr-only" htmlFor="careers-contact-department">
                  Select department
                </label>
                <select
                  id="careers-contact-department"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                  className={`${fieldClassName} appearance-none bg-white`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.75rem center",
                    backgroundSize: "1.1rem",
                  }}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <label className="sr-only" htmlFor="careers-contact-message">
                  Your message
                </label>
                <textarea
                  id="careers-contact-message"
                  required
                  rows={4}
                  placeholder="Your message"
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  className={`${fieldClassName} min-h-[120px] resize-y`}
                />

                {submitError ? (
                  <p className="!text-left text-sm text-red-600" role="alert">
                    {submitError}
                  </p>
                ) : null}
                {submitted ? (
                  <p className="!text-left text-sm text-secondary-700" role="status">
                    Thanks — your message has been sent.
                  </p>
                ) : null}

                <div className="mt-1 flex justify-stretch sm:justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="min-h-[48px] w-full rounded-lg bg-secondary-600 px-6 py-3 text-base font-bold text-white shadow-md transition-colors hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:text-sm"
                  >
                    {submitting ? "Sending…" : "Contact us"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
