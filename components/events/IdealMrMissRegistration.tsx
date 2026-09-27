"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ContestantCardPanel } from "@/components/events/ContestantCardPanel";
import { formatIdealFeeKes, IDEAL_APPLICATION_FEE_DEFAULT_KES, type ContestantCardData } from "@/lib/ideal-mr-miss";
import { KENYA_COUNTY_DEFINITIONS } from "@/lib/kenya-counties";
import { FileText, MessageCircle } from "lucide-react";

const EVENT_ISO = "2026-12-12T00:00:00+03:00";
const WHATSAPP_URL =
  "https://wa.me/254797777347?text=" +
  encodeURIComponent("Hello, I need help with the Kenya’s Ideal Mr & Miss 2026 application.");

type Category = "kids" | "teens" | "adults";
type ApplyingAs = "mr" | "miss";

function ageOnEvent(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const dob = new Date(`${isoDate}T00:00:00+03:00`);
  const event = new Date(EVENT_ISO);
  if (Number.isNaN(dob.getTime())) return null;
  let age = event.getFullYear() - dob.getFullYear();
  const month = event.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && event.getDate() < dob.getDate())) age -= 1;
  return age;
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function remaining(target: number) {
  const diff = Math.max(0, target - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const inputClass =
  "mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-secondary-700 focus:ring-2 focus:ring-secondary-700/20 sm:text-sm";

const choiceClass = "flex min-h-11 items-center gap-2.5 [&_input]:h-5 [&_input]:w-5 [&_input]:shrink-0";

const STEP_TITLES = [
  "Contestant details",
  "Parent or guardian",
  "Education and interests",
  "Photo and availability",
  "Declarations and consent",
];

export default function IdealMrMissRegistration() {
  const eventMs = useMemo(() => new Date(EVENT_ISO).getTime(), []);
  const [clock, setClock] = useState(() => remaining(eventMs));
  const [about, setAbout] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [priorEvent, setPriorEvent] = useState<"" | "yes" | "no">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<ContestantCardData | null>(null);
  const [emailedTo, setEmailedTo] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [feeKes, setFeeKes] = useState(IDEAL_APPLICATION_FEE_DEFAULT_KES);
  const formRef = useRef<HTMLFormElement>(null);
  const feeLabel = formatIdealFeeKes(feeKes);

  useEffect(() => {
    const id = window.setInterval(() => setClock(remaining(eventMs)), 1000);
    return () => window.clearInterval(id);
  }, [eventMs]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/events/ideal-mr-miss/application-fee")
      .then((res) => res.json())
      .then((json: { application_fee_kes?: number }) => {
        if (!cancelled && typeof json.application_fee_kes === "number") setFeeKes(json.application_fee_kes);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const age = dateOfBirth ? ageOnEvent(dateOfBirth) : null;
  const minor = age != null && age < 18;
  const aboutWords = wordCount(about);

  useEffect(() => {
    if (step == null) return;
    document.getElementById("application")?.scrollIntoView({ block: "start" });
  }, [step]);

  function validateStep(current: number, data: FormData): string | null {
    if (current === 0) {
      const town = String(data.get("town") || "").trim();
      const county = String(data.get("county") || "").trim();
      const knownCounty = KENYA_COUNTY_DEFINITIONS.some((item) => item.label === county);
      if (!String(data.get("fullName") || "").trim() || !dateOfBirth || !category || !data.get("applyingAs") || !town || !knownCounty) {
        return "Complete the required contestant details.";
      }
      if (age == null) return "Enter a valid date of birth.";
      const band = category === "kids" ? [7, 12] : category === "teens" ? [13, 17] : category === "adults" ? [18, 25] : null;
      if (!band || age < band[0] || age > band[1]) {
        return "Date of birth does not match the selected category on 12 December 2026.";
      }
    }
    if (current === 1 && minor) {
      if (!String(data.get("guardianName") || "").trim() || !String(data.get("guardianRelationship") || "").trim() || !String(data.get("guardianPhone") || "").trim()) {
        return "Parent or guardian details are required for contestants under 18.";
      }
    }
    if (current === 2) {
      if (aboutWords < 50 || aboutWords > 100) return "Tell us a little about yourself in 50 to 100 words.";
      if (!String(data.get("whyParticipate") || "").trim() || !String(data.get("talent") || "").trim() || !String(data.get("modelsForEducation") || "").trim()) {
        return "Complete the education and interests questions.";
      }
    }
    if (current === 3) {
      const photo = data.get("photo");
      if (!(photo instanceof File) || photo.size === 0) return "Upload one recent, clear photo of the contestant.";
      if (!data.get("priorEvent") || !data.get("available")) return "Answer the photo and availability questions.";
    }
    return null;
  }

  function goNext() {
    if (step == null || !formRef.current) return;
    const message = validateStep(step, new FormData(formRef.current));
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep(Math.min(step + 1, STEP_TITLES.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => (current == null || current <= 0 ? null : current - 1));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);

    const town = String(data.get("town") || "").trim();
    const county = String(data.get("county") || "").trim();
    const knownCounty = KENYA_COUNTY_DEFINITIONS.some((item) => item.label === county);
    if (!data.get("fullName") || !dateOfBirth || !category || !data.get("applyingAs") || !town || !knownCounty) {
      setError("Complete the required contestant details.");
      return;
    }
    data.set("townCounty", `${town}, ${county}`);
    if (age == null) {
      setError("Enter a valid date of birth.");
      return;
    }
    const band =
      category === "kids" ? [7, 12] : category === "teens" ? [13, 17] : category === "adults" ? [18, 25] : null;
    if (!band || age < band[0] || age > band[1]) {
      setError("Date of birth does not match the selected category on 12 December 2026.");
      return;
    }
    if (aboutWords < 50 || aboutWords > 100) {
      setError("Tell us a little about yourself in 50 to 100 words.");
      return;
    }
    if (minor) {
      if (!data.get("guardianName") || !data.get("guardianRelationship") || !data.get("guardianPhone")) {
        setError("Parent or guardian details are required for contestants under 18.");
        return;
      }
      if (!data.get("guardianConsent")) {
        setError("Parent or guardian consent is required for contestants under 18.");
        return;
      }
    }
    if (!data.get("accuracy") || !data.get("fee") || !data.get("contact")) {
      setError("Confirm the required declarations.");
      return;
    }
    const photo = data.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      setError("Upload one recent, clear photo of the contestant.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/events/ideal-mr-miss/apply", { method: "POST", body: data });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        card?: ContestantCardData;
        emailedTo?: string | null;
      };
      if (!res.ok || !json.card) {
        setError(json.error || "Could not submit the application.");
        return;
      }
      setCard(json.card);
      setEmailedTo(json.emailedTo ?? null);
      form.reset();
      setAbout("");
      setCategory("");
      setDateOfBirth("");
      setPriorEvent("");
    } catch {
      setError("Could not submit the application. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const units = [
    { label: "Days", value: clock.days },
    { label: "Hours", value: clock.hours },
    { label: "Minutes", value: clock.minutes },
    { label: "Seconds", value: clock.seconds },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f1ec] px-4 pb-28 pt-[var(--site-nav-height)] sm:px-6 md:pb-20 lg:px-4">
      <div className="mx-auto w-full max-w-6xl lg:max-w-[640px]">
        <div className="grid items-center gap-6">
          <div id="event-details" className="text-center">
            {step === null || card ? (
            <h1 className="mx-auto mt-6 inline-grid max-w-full grid-cols-[minmax(0,auto)_auto] items-stretch gap-x-2.5 text-left font-montserrat sm:mt-8 sm:gap-x-3.5">
              <span className="col-start-1 row-start-1 flex flex-col items-end justify-end pr-0.5 text-right text-[15px] font-semibold leading-[1.05] text-gray-900 sm:text-xl">
                <span className="block text-right">Kenya’s</span>
                <span className="block text-right">Ideal</span>
              </span>
              <span className="col-start-1 row-start-2 mt-1 text-left text-[2.15rem] font-extrabold leading-none tracking-tight text-secondary-800 min-[380px]:text-[2.65rem] sm:text-6xl lg:text-7xl">
                Mr &amp; Miss
              </span>
              <span className="col-start-2 row-span-2 row-start-1 flex flex-col justify-between border-l-[3px] border-secondary-800 pl-2.5 text-left sm:pl-3.5">
                <span className="block text-left text-[2.15rem] font-extrabold leading-none tracking-tight text-secondary-800 min-[380px]:text-5xl sm:text-6xl">
                  20
                </span>
                <span className="block text-left text-[2.15rem] font-extrabold leading-none tracking-tight text-secondary-800 min-[380px]:text-5xl sm:text-6xl">
                  26
                </span>
              </span>
            </h1>
            ) : (
              <p className="mt-4 text-center text-sm font-semibold text-secondary-800">Kenya’s Ideal Mr &amp; Miss 2026</p>
            )}
            {step === null && !card ? (
              <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-gray-700 sm:text-[15px]">
                Welcome to the contestant application for Kenya’s Ideal Mr &amp; Miss 2026. The theme is Models for
                Education. The event is on 12 December 2026 at Malaika Lounge, Malindi, and the registration fee is{" "}
                {feeLabel}. Submit this form so Changer Fusions can review the entry.
              </p>
            ) : null}
          </div>

          {step === null && !card ? (
            <section className="rounded-2xl bg-secondary-800 px-4 py-6 text-center text-white shadow-md sm:px-8 sm:py-8">
              <h2 className="text-base font-bold sm:text-lg">Event day — 12 Dec 2026</h2>
              <p className="mt-1 text-center text-sm text-white/85">Register before the event. The registration fee is {feeLabel}.</p>
              <div className="mt-6 grid grid-cols-4 gap-2 sm:mt-7 sm:gap-4 lg:flex lg:items-start lg:justify-center lg:gap-6">
                {units.map((unit) => (
                  <div key={unit.label} className="min-w-0 lg:w-16">
                    <div className="mx-auto flex aspect-square w-full max-w-[4.25rem] items-center justify-center rounded-full border-2 border-white/80 text-lg font-semibold tabular-nums sm:max-w-[5rem] sm:text-2xl lg:h-16 lg:w-16 lg:max-w-none">
                      {unit.value}
                    </div>
                    <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-xs">
                      {unit.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {step === null && !card ? (
        <div className="mt-6 grid gap-4 md:max-lg:grid-cols-2 md:max-lg:gap-6">
          <section className="flex flex-col rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm sm:px-6 sm:py-8">
            <span className="mx-auto inline-flex h-10 w-10 items-center justify-center text-secondary-800">
              <FileText className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <h2 className="mt-2 text-xl font-bold text-gray-900">Contestant application</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-gray-600">
              Register in the category you are applying for: Kids 7–12, Teens 13–17, or Adults 18–25.
            </p>
            <div className="mt-auto flex flex-col gap-3 pt-5">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep(0);
                }}
                className="flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-700 px-4 text-center text-sm font-bold text-white hover:bg-secondary-800"
              >
                Apply for Kenya’s Ideal Mr &amp; Miss →
              </button>
              <a
                href="#event-details"
                className="flex min-h-11 w-full items-center justify-center rounded-lg border border-secondary-700 px-4 text-sm font-semibold text-secondary-800 hover:bg-secondary-50"
              >
                Event details →
              </a>
            </div>
          </section>

          <section id="help" className="flex flex-col rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm sm:px-6 sm:py-8">
            <span className="mx-auto inline-flex h-10 w-10 items-center justify-center text-secondary-700">
              <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <h2 className="mt-2 text-xl font-bold text-gray-900">Need help?</h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-gray-600">
              If you have any problem registering or checking what to send, reach Changer Fusions on WhatsApp and the
              events team will assist.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto flex min-h-11 w-full items-center justify-center rounded-lg border border-secondary-700 px-4 py-2.5 text-center text-sm font-semibold leading-snug text-secondary-800 hover:bg-secondary-50"
            >
              Changer Fusions WhatsApp: 0797 777 347
            </a>
          </section>
        </div>
        ) : null}

        {(card || step !== null) && (
        <section id="application" className="mt-6 scroll-mt-[var(--site-nav-height)] rounded-2xl border border-gray-200 bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-8">
          {card ? (
            <ContestantCardPanel card={card} emailedTo={emailedTo} feeKes={feeKes} />
          ) : step !== null ? (
            <form ref={formRef} onSubmit={onSubmit} className="space-y-6 text-left [&_fieldset]:min-w-0 [&_label]:text-left [&_legend]:text-left [&_p]:text-left [&_span]:text-left">
              <div>
                <p className="text-center text-sm font-semibold text-secondary-800">
                  Step {step + 1} of {STEP_TITLES.length}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-secondary-700"
                    style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className={step === 0 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">1. Contestant details</h2>
                <div className="mt-4 grid gap-4 sm:max-lg:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Full name <span className="text-negative">*</span>
                    <input name="fullName" required={step === 0} className={inputClass} autoComplete="name" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Date of birth <span className="text-negative">*</span>
                    <input
                      name="dateOfBirth"
                      type="date"
                      required={step === 0}
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-800">
                      Which category are you applying for? <span className="text-negative">*</span>
                    </legend>
                    <div className="mt-2 grid gap-1 text-sm text-gray-700 sm:grid-cols-1">
                      {(
                        [
                          ["kids", "Kids: 7–12 years"],
                          ["teens", "Teens: 13–17 years"],
                          ["adults", "Adults: 18–25 years"],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value} className={choiceClass}>
                          <input
                            type="radio"
                            name="category"
                            value={value}
                            required={step === 0}
                            checked={category === value}
                            onChange={() => setCategory(value)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-800">
                      Are you applying for Mr or Miss? <span className="text-negative">*</span>
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-x-6 text-sm text-gray-700">
                      {(["mr", "miss"] as ApplyingAs[]).map((value) => (
                        <label key={value} className={choiceClass}>
                          <input type="radio" name="applyingAs" value={value} required={step === 0} />
                          {value === "mr" ? "Mr" : "Miss"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="block text-sm font-semibold text-gray-800">
                    Town <span className="text-negative">*</span>
                    <input name="town" required={step === 0} className={inputClass} autoComplete="address-level2" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    County of residence <span className="text-negative">*</span>
                    <select
                      name="county"
                      required={step === 0}
                      defaultValue=""
                      className={`${inputClass} cursor-pointer invalid:text-gray-500`}
                    >
                      <option value="" disabled>
                        Select a county
                      </option>
                      {KENYA_COUNTY_DEFINITIONS.map((item) => (
                        <option key={item.label} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Contestant’s phone number for calls <span className="font-medium text-gray-500">(if applicable)</span>
                    <input name="phoneCalls" type="tel" className={inputClass} autoComplete="tel" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Contestant’s WhatsApp number <span className="font-medium text-gray-500">(if applicable)</span>
                    <input name="phoneWhatsapp" type="tel" className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800 sm:max-lg:col-span-2">
                    Contestant’s email address <span className="font-medium text-gray-500">(if applicable)</span>
                    <input name="email" type="email" className={inputClass} autoComplete="email" />
                  </label>
                </div>
              </div>

              <div className={step === 1 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">2. Parent or guardian details</h2>
                <p className="mt-1 text-left text-sm text-gray-600">Complete this section for contestants under 18.</p>
                <div className="mt-4 grid gap-4 sm:max-lg:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Parent or legal guardian’s full name{" "}
                    {minor ? <span className="text-negative">*</span> : <span className="font-medium text-gray-500">(required for minors)</span>}
                    <input name="guardianName" required={step === 1 && minor} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Relationship to the contestant{" "}
                    {minor ? <span className="text-negative">*</span> : <span className="font-medium text-gray-500">(required for minors)</span>}
                    <input name="guardianRelationship" required={step === 1 && minor} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Parent or legal guardian’s phone number{" "}
                    {minor ? <span className="text-negative">*</span> : <span className="font-medium text-gray-500">(required for minors)</span>}
                    <input name="guardianPhone" type="tel" required={step === 1 && minor} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Parent or legal guardian’s email address <span className="font-medium text-gray-500">(optional)</span>
                    <input name="guardianEmail" type="email" className={inputClass} />
                  </label>
                </div>
              </div>

              <div className={step === 2 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">3. Education and interests</h2>
                <div className="mt-4 grid gap-4">
                  <label className="block text-sm font-semibold text-gray-800">
                    Which school, college or learning institution do you currently attend?{" "}
                    <span className="font-medium text-gray-500">(optional)</span>
                    <input name="institution" className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Tell us a little about yourself. <span className="text-negative">*</span>
                    <span className="font-medium text-gray-500"> (50–100 words)</span>
                    <textarea
                      name="about"
                      required={step === 2}
                      rows={5}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className={inputClass}
                    />
                    <span className={`mt-1 block text-xs ${aboutWords > 0 && (aboutWords < 50 || aboutWords > 100) ? "text-negative" : "text-gray-500"}`}>
                      {aboutWords} words
                    </span>
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Why would you like to participate in Kenya’s Ideal Mr &amp; Miss? <span className="text-negative">*</span>
                    <textarea name="whyParticipate" required={step === 2} rows={4} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    What talent, skill or interest would you like to showcase? <span className="text-negative">*</span>
                    <textarea name="talent" required={step === 2} rows={3} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    What does “Models for Education” mean to you? <span className="text-negative">*</span>
                    <span className="mt-1 block font-medium text-gray-500">
                      Younger contestants may receive help from a parent or guardian.
                    </span>
                    <textarea name="modelsForEducation" required={step === 2} rows={4} className={inputClass} />
                  </label>
                </div>
              </div>

              <div className={step === 3 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">4. Photo and availability</h2>
                <div className="mt-4 grid gap-4">
                  <label className="block text-sm font-semibold text-gray-800">
                    Upload one recent, clear photo of the contestant. <span className="text-negative">*</span>
                    <span className="mt-1 block font-medium text-gray-500">Required for application review. JPG, PNG, or WebP, up to 5MB.</span>
                    <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required={step === 3} className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-secondary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-800`} />
                  </label>
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-800">
                      Have you participated in a modelling or talent event before?
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-x-6 text-sm text-gray-700">
                      {(["yes", "no"] as const).map((value) => (
                        <label key={value} className={choiceClass}>
                          <input
                            type="radio"
                            name="priorEvent"
                            value={value}
                            required={step === 3}
                            checked={priorEvent === value}
                            onChange={() => setPriorEvent(value)}
                          />
                          {value === "yes" ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {priorEvent === "yes" ? (
                    <label className="block text-sm font-semibold text-gray-800">
                      If yes, which event? <span className="font-medium text-gray-500">(optional)</span>
                      <input name="priorEventName" className={inputClass} />
                    </label>
                  ) : null}
                  <fieldset>
                    <legend className="text-sm font-semibold text-gray-800">
                      Will you be available to attend the event in Malindi on 12 December 2026 if selected?{" "}
                      <span className="text-negative">*</span>
                    </legend>
                    <div className="mt-2 flex flex-wrap gap-x-6 text-sm text-gray-700">
                      {(["yes", "no"] as const).map((value) => (
                        <label key={value} className={choiceClass}>
                          <input type="radio" name="available" value={value} required={step === 3} />
                          {value === "yes" ? "Yes" : "No"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className={step === 4 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">5. Declarations and consent</h2>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <label className="flex items-start gap-3">
                    <input name="accuracy" type="checkbox" value="true" required={step === 4} className="mt-1 h-5 w-5 shrink-0" />
                    <span>
                      I confirm that the information provided in this application is accurate. I understand that
                      submitting an application does not guarantee selection.
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input name="fee" type="checkbox" value="true" required={step === 4} className="mt-1 h-5 w-5 shrink-0" />
                    <span>
                      I understand that the registration fee is {feeLabel} and that Changer Fusions will communicate the
                      payment and participation instructions.
                    </span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input name="contact" type="checkbox" value="true" required={step === 4} className="mt-1 h-5 w-5 shrink-0" />
                    <span>I agree to be contacted about this application using the details provided.</span>
                  </label>
                  <label className="flex items-start gap-3">
                    <input name="guardianConsent" type="checkbox" value="true" required={step === 4 && minor} className="mt-1 h-5 w-5 shrink-0" />
                    <span>
                      I am the parent or legal guardian of the contestant named above, and I consent to their
                      application and participation, subject to the event rules shared with me.
                      {minor ? " Required for contestants under 18." : " Required only for contestants under 18."}
                    </span>
                  </label>
                </div>
              </div>

              <div className={step === 4 ? "space-y-8" : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">Photo and video marketing consent</h2>
                <p className="mt-2 text-left text-sm leading-relaxed text-gray-700">
                  May Changer Fusions use photos or videos of the contestant to promote and report on Kenya’s Ideal Mr
                  &amp; Miss, including on social media, its website and event promotional materials?{" "}
                  <span className="text-negative">*</span>
                </p>
                <p className="mt-2 text-left text-sm text-gray-600">
                  {minor
                    ? "For contestants under 18, the parent or legal guardian gives this answer."
                    : "For contestants aged 18–25, the contestant gives this answer."}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-6 text-sm text-gray-700">
                  {(["yes", "no"] as const).map((value) => (
                    <label key={value} className={choiceClass}>
                      <input type="radio" name="marketingConsent" value={value} required={step === 4} />
                      {value === "yes" ? "Yes" : "No"}
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-left text-sm text-gray-600">
                  Choosing “No” does not prevent a contestant from applying. The application photo may still be used
                  privately to review the entry, but it should not be published for marketing without consent.
                </p>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
              ) : null}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-secondary-700 px-4 text-sm font-semibold text-secondary-800 hover:bg-secondary-50"
                >
                  {step === 0 ? "Back" : "Previous"}
                </button>
                {step < STEP_TITLES.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-secondary-700 px-4 text-sm font-bold text-white hover:bg-secondary-800"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-secondary-700 px-4 text-center text-sm font-bold text-white hover:bg-secondary-800 disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Apply"}
                  </button>
                )}
              </div>
            </form>
          ) : null}
        </section>
        )}
      </div>
    </div>
  );
}
