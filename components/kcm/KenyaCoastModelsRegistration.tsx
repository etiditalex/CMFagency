"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileText, MessageCircle } from "lucide-react";
import { KENYA_COUNTY_DEFINITIONS } from "@/lib/kenya-counties";
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/kenya-phone";
import {
  formatForumFeeKes,
  forumFeeKes,
  KCM_FORUM_EVENT_ISO,
  KCM_FORUM_EVENT_LABEL,
  KCM_FORUM_MEMBER_FEE_KES,
  KCM_FORUM_NON_MEMBER_FEE_KES,
  KCM_FORUM_TIME_LABEL,
  KCM_FORUM_VENUE,
} from "@/lib/kenya-coast-models";

const WHATSAPP_URL =
  "https://wa.me/254797777347?text=" +
  encodeURIComponent("Hello, I need help registering for the Kenya Coast Models forum.");

const STEP_TITLES = ["Your details", "Membership and category", "Payment", "Confirmation"];

const inputClass =
  "mt-1.5 w-full min-w-0 max-w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-secondary-700 focus:ring-2 focus:ring-secondary-700/20 sm:text-sm";
const choiceClass = "flex min-h-11 items-center gap-2.5 text-sm text-gray-700 [&_input]:h-5 [&_input]:w-5 [&_input]:shrink-0";

type AttendeeType = "" | "model" | "designer" | "guest";
type ModelLevel = "" | "emerging" | "professional";
type PaymentStatus = "idle" | "pending" | "success" | "failed";

function remaining(target: number) {
  const totalSeconds = Math.floor(Math.max(0, target - Date.now()) / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function validEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function KenyaCoastModelsRegistration() {
  const eventMs = useMemo(() => new Date(KCM_FORUM_EVENT_ISO).getTime(), []);
  const [clock, setClock] = useState(() => remaining(eventMs));
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeats, setRemainingSeats] = useState<number | null>(null);

  const [fullName, setFullName] = useState("");
  const [phoneCalls, setPhoneCalls] = useState("");
  const [sameWhatsapp, setSameWhatsapp] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [email, setEmail] = useState("");
  const [town, setTown] = useState("");
  const [county, setCounty] = useState("");
  const [isMember, setIsMember] = useState<"" | "yes" | "no">("");
  const [attendeeType, setAttendeeType] = useState<AttendeeType>("");
  const [modelLevel, setModelLevel] = useState<ModelLevel>("");
  const [brandName, setBrandName] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");

  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentNote, setPaymentNote] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ fullName: string; feeKes: number; receipt: string | null; emailedTo: string | null } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const whatsapp = sameWhatsapp ? phoneCalls : whatsappInput;
  const member = isMember === "yes";
  const feeKes = isMember === "" ? null : forumFeeKes(member);
  const paymentLocked = paymentStatus === "pending" || paymentStatus === "success";

  useEffect(() => {
    const id = window.setInterval(() => setClock(remaining(eventMs)), 1000);
    return () => window.clearInterval(id);
  }, [eventMs]);

  useEffect(() => {
    fetch("/api/kcm/kenya-coast-models/availability")
      .then((res) => res.json())
      .then((json: { remaining?: number }) => {
        if (typeof json.remaining === "number") setRemainingSeats(json.remaining);
      })
      .catch(() => undefined);
  }, [done]);

  useEffect(() => {
    if (step == null) return;
    document.getElementById("forum-registration")?.scrollIntoView({ block: "start" });
  }, [step]);

  useEffect(() => {
    if (!registrationId || paymentStatus !== "pending") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/kcm/kenya-coast-models/payment-status?registration_id=${encodeURIComponent(registrationId)}`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          payment_status?: string;
          mpesa_receipt?: string | null;
          review_notes?: string | null;
        };
        if (!res.ok) return;
        if (json.payment_status === "success") {
          setPaymentStatus("success");
          setReceipt(json.mpesa_receipt ?? null);
          setPaymentNote("Payment received. You can continue.");
        } else if (json.payment_status === "failed") {
          setPaymentStatus("failed");
          setPaymentNote(json.review_notes || "The M-Pesa prompt was not completed. Send it again.");
        }
      } catch {
        // Keep waiting for the callback.
      }
    };
    void poll();
    const timer = window.setInterval(poll, 4000);
    return () => window.clearInterval(timer);
  }, [registrationId, paymentStatus]);

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!fullName.trim() || !town.trim() || !KENYA_COUNTY_DEFINITIONS.some((item) => item.label === county)) {
        return "Enter your name, town, and county of residence.";
      }
      if (!isValidKenyaPhone(normalizeKenyaPhone(phoneCalls)) || !isValidKenyaPhone(normalizeKenyaPhone(whatsapp))) {
        return "Enter a valid phone number and WhatsApp number.";
      }
      if (!validEmail(email)) return "Enter a valid email address, or leave it blank.";
    }
    if (current === 1) {
      if (isMember !== "yes" && isMember !== "no") return "Say whether you are a Kenya-Coast Models member.";
      if (!attendeeType) return "Choose how you will attend.";
      if (attendeeType === "model" && !modelLevel) return "Choose emerging or professional model.";
    }
    if (current === 2 && paymentStatus !== "success") {
      return "Complete the M-Pesa prompt before continuing.";
    }
    return null;
  }

  function goNext() {
    if (step == null) return;
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    if (step === 1) setMpesaPhone((current) => current || phoneCalls);
    setStep(Math.min(step + 1, STEP_TITLES.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => (current == null || current <= 0 ? null : current - 1));
  }

  async function sendPrompt() {
    setError(null);
    setPaymentNote(null);
    if (isMember !== "yes" && isMember !== "no") {
      setError("Choose member or non-member before payment.");
      return;
    }
    if (!isValidKenyaPhone(normalizeKenyaPhone(mpesaPhone || phoneCalls))) {
      setError("Enter the M-Pesa number that should receive the prompt.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/kcm/kenya-coast-models/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phoneCalls,
          phoneWhatsapp: whatsapp,
          email,
          town,
          county,
          isMember: member,
          attendeeType,
          modelLevel,
          brandName,
          mpesaPhone: mpesaPhone || phoneCalls,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; registration_id?: string };
      if (!res.ok || !json.registration_id) {
        setPaymentStatus("failed");
        setError(json.error || "Could not send the M-Pesa prompt.");
        return;
      }
      setRegistrationId(json.registration_id);
      setPaymentStatus("pending");
      setReceipt(null);
      setPaymentNote("Check your phone and enter your M-Pesa PIN. Registration continues after payment succeeds.");
    } catch {
      setPaymentStatus("failed");
      setError("Could not send the M-Pesa prompt. Check your connection and try again.");
    } finally {
      setPaying(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (paymentStatus !== "success" || !registrationId) {
      setError("Complete the M-Pesa prompt before finishing registration.");
      return;
    }
    if (!confirmed) {
      setError("Confirm that your details are accurate and the attendance fee is paid.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/kcm/kenya-coast-models/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, confirmed: true }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        fullName?: string;
        feeKes?: number;
        receipt?: string | null;
        emailedTo?: string | null;
      };
      if (!res.ok || !json.fullName || typeof json.feeKes !== "number") {
        setError(json.error || "Could not complete registration.");
        return;
      }
      setDone({
        fullName: json.fullName,
        feeKes: json.feeKes,
        receipt: json.receipt ?? receipt,
        emailedTo: json.emailedTo ?? null,
      });
      setStep(null);
    } catch {
      setError("Could not complete registration. Check your connection and try again.");
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
  const full = remainingSeats === 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f1ec] px-4 pb-28 pt-[var(--site-nav-height)] sm:px-6 md:pb-20 lg:px-4">
      <div className="mx-auto w-full max-w-6xl lg:max-w-[640px]">
        <div className="grid items-center gap-6">
          <div id="event-details" className="text-center">
            {step === null || done ? (
              <h1 className="mx-auto mt-6 inline-grid max-w-full grid-cols-[minmax(0,auto)_auto] items-stretch gap-x-2.5 text-left font-montserrat sm:mt-8 sm:gap-x-3.5">
                <span className="col-start-1 row-start-1 flex flex-col items-end justify-end pr-0.5 text-right text-[15px] font-semibold leading-[1.05] text-gray-900 sm:text-xl">
                  <span className="block text-right">Kenya</span>
                  <span className="block text-right">Coast</span>
                </span>
                <span className="col-start-1 row-start-2 mt-1 text-left text-[2.15rem] font-extrabold leading-none tracking-tight text-secondary-800 min-[380px]:text-[2.65rem] sm:text-6xl lg:text-7xl">
                  Models
                </span>
                <span className="col-start-2 row-span-2 row-start-1 flex flex-col justify-between border-l-[3px] border-secondary-800 pl-2.5 text-left sm:pl-3.5">
                  <span className="block text-left text-[2.15rem] font-extrabold leading-none tracking-tight text-secondary-800 min-[380px]:text-5xl sm:text-6xl">20</span>
                  <span className="block text-left text-[2.15rem] font-extrabold leading-none tracking-tight text-secondary-800 min-[380px]:text-5xl sm:text-6xl">26</span>
                </span>
              </h1>
            ) : (
              <p className="mt-4 text-center text-sm font-semibold text-secondary-800">Kenya Coast Models</p>
            )}
            {step === null && !done ? (
              <div className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-gray-700 sm:text-[15px]">
                <p className="text-center font-semibold text-gray-900">Sustainable Fashion &amp; Models Empowerment Forum</p>
                <p className="mt-2 text-center">Fashion with Purpose, Models with Power</p>
                <p className="mt-2 text-center">
                  Presented by Changer Fusions for Kenya-Coast Models. {KCM_FORUM_EVENT_LABEL}, {KCM_FORUM_TIME_LABEL.toLowerCase()}, at {KCM_FORUM_VENUE}.
                  Attendance is limited to 100 guests.
                </p>
              </div>
            ) : null}
          </div>

          {step === null && !done ? (
            <section className="rounded-2xl bg-secondary-800 px-4 py-6 text-center text-white shadow-md sm:px-8 sm:py-8">
              <h2 className="text-base font-bold sm:text-lg">Forum day — 28 Nov 2026</h2>
              <p className="mt-1 text-center text-sm text-white/85">
                {KCM_FORUM_TIME_LABEL} at {KCM_FORUM_VENUE}. Members {formatForumFeeKes(KCM_FORUM_MEMBER_FEE_KES)}, non-members{" "}
                {formatForumFeeKes(KCM_FORUM_NON_MEMBER_FEE_KES)}.
              </p>
              <div className="mt-6 grid grid-cols-4 gap-2 sm:mt-7 sm:gap-4 lg:flex lg:items-start lg:justify-center lg:gap-6">
                {units.map((unit) => (
                  <div key={unit.label} className="min-w-0 lg:w-16">
                    <div className="mx-auto flex aspect-square w-full max-w-[4.25rem] items-center justify-center rounded-full border-2 border-white/80 text-lg font-semibold tabular-nums sm:max-w-[5rem] sm:text-2xl lg:h-16 lg:w-16 lg:max-w-none">
                      {unit.value}
                    </div>
                    <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-white/80 sm:text-xs">{unit.label}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {step === null && !done ? (
          <div className="mt-6 grid gap-4 md:max-lg:grid-cols-2 md:max-lg:gap-6">
            <section className="flex flex-col rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm sm:px-6 sm:py-8">
              <span className="mx-auto inline-flex h-10 w-10 items-center justify-center text-secondary-800">
                <FileText className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Attendance registration</h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-gray-600">
                {full
                  ? "This forum is full. Attendance was limited to 100 guests."
                  : `Register as a member or guest. ${remainingSeats == null ? "100 places." : `${remainingSeats} of 100 places left.`}`}
              </p>
              <div className="mt-auto flex flex-col gap-3 pt-5">
                <button
                  type="button"
                  disabled={full}
                  onClick={() => {
                    setError(null);
                    setStep(0);
                  }}
                  className="flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary-700 px-4 text-center text-sm font-bold text-white hover:bg-secondary-800 disabled:opacity-60"
                >
                  Register to attend →
                </button>
                <a
                  href="#event-details"
                  className="flex min-h-11 w-full items-center justify-center rounded-lg border border-secondary-700 px-4 text-sm font-semibold text-secondary-800 hover:bg-secondary-50"
                >
                  Event details →
                </a>
              </div>
            </section>
            <section className="flex flex-col rounded-2xl border border-gray-200 bg-white px-5 py-7 text-center shadow-sm sm:px-6 sm:py-8">
              <span className="mx-auto inline-flex h-10 w-10 items-center justify-center text-secondary-700">
                <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Need help?</h2>
              <p className="mt-2 text-center text-sm leading-relaxed text-gray-600">
                If you have any problem registering or paying, reach Changer Fusions on WhatsApp and the events team will assist.
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

        {done ? (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center shadow-sm sm:px-8">
            <h2 className="text-xl font-bold text-gray-900">Registration complete</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-gray-700">
              {done.fullName}, your place at the Sustainable Fashion &amp; Models Empowerment Forum is confirmed. The attendance fee of{" "}
              {formatForumFeeKes(done.feeKes)} is paid{done.receipt ? ` (M-Pesa ${done.receipt})` : ""}.
            </p>
            <p className="mt-3 text-sm text-gray-700">
              {KCM_FORUM_EVENT_LABEL}, {KCM_FORUM_TIME_LABEL.toLowerCase()}, {KCM_FORUM_VENUE}.
            </p>
            {done.emailedTo ? <p className="mt-3 text-sm text-gray-700">A copy was sent to {done.emailedTo}.</p> : null}
          </section>
        ) : null}

        {step !== null && !done ? (
          <section id="forum-registration" className="mt-6 scroll-mt-[var(--site-nav-height)] rounded-2xl border border-gray-200 bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-8">
            <form onSubmit={onSubmit} className="space-y-6 text-left [&_label]:text-left [&_legend]:text-left [&_p]:text-left [&_span]:text-left">
              <div>
                <p className="text-center text-sm font-semibold text-secondary-800">
                  Step {step + 1} of {STEP_TITLES.length}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-secondary-700" style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} />
                </div>
              </div>

              <div className={step === 0 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">1. Your details</h2>
                <div className="mt-4 grid gap-4">
                  <label className="block text-sm font-semibold text-gray-800">
                    Full name <span className="text-negative">*</span>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} required={step === 0} className={inputClass} autoComplete="name" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Phone number for calls <span className="text-negative">*</span>
                    <input value={phoneCalls} onChange={(e) => setPhoneCalls(e.target.value)} type="tel" required={step === 0} className={inputClass} autoComplete="tel" />
                  </label>
                  <label className="flex items-start gap-3 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={sameWhatsapp}
                      onChange={(e) => setSameWhatsapp(e.target.checked)}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                    <span>Same as phone number</span>
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    WhatsApp number <span className="text-negative">*</span>
                    <input
                      value={sameWhatsapp ? phoneCalls : whatsappInput}
                      onChange={(e) => setWhatsappInput(e.target.value)}
                      type="tel"
                      required={step === 0}
                      disabled={sameWhatsapp}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Email address <span className="font-medium text-gray-500">(optional)</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputClass} autoComplete="email" />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    Town <span className="text-negative">*</span>
                    <input value={town} onChange={(e) => setTown(e.target.value)} required={step === 0} className={inputClass} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-800">
                    County of residence <span className="text-negative">*</span>
                    <select value={county} onChange={(e) => setCounty(e.target.value)} required={step === 0} className={`${inputClass} cursor-pointer`}>
                      <option value="">Select a county</option>
                      {KENYA_COUNTY_DEFINITIONS.map((item) => (
                        <option key={item.label} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className={step === 1 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">2. Membership and attendee category</h2>
                <fieldset className="mt-4" disabled={paymentLocked}>
                  <legend className="text-sm font-semibold text-gray-800">
                    Are you a Kenya-Coast Models member? <span className="text-negative">*</span>
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-x-6">
                    {(["yes", "no"] as const).map((value) => (
                      <label key={value} className={choiceClass}>
                        <input type="radio" name="isMember" checked={isMember === value} onChange={() => setIsMember(value)} required={step === 1} />
                        {value === "yes" ? "Member" : "Non-member"}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="mt-4" disabled={paymentLocked}>
                  <legend className="text-sm font-semibold text-gray-800">
                    How will you attend? <span className="text-negative">*</span>
                  </legend>
                  <div className="mt-2 flex flex-col gap-1">
                    {(
                      [
                        ["model", "Model"],
                        ["designer", "Fashion Designer"],
                        ["guest", "Guest"],
                      ] as const
                    ).map(([value, label]) => (
                      <label key={value} className={choiceClass}>
                        <input
                          type="radio"
                          name="attendeeType"
                          checked={attendeeType === value}
                          onChange={() => setAttendeeType(value)}
                          required={step === 1}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {attendeeType === "model" ? (
                  <fieldset className="mt-4" disabled={paymentLocked}>
                    <legend className="text-sm font-semibold text-gray-800">
                      Which best describes you? <span className="text-negative">*</span>
                    </legend>
                    <div className="mt-2 flex flex-col gap-1">
                      {(
                        [
                          ["emerging", "Emerging Model"],
                          ["professional", "Professional Model"],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value} className={choiceClass}>
                          <input type="radio" checked={modelLevel === value} onChange={() => setModelLevel(value)} required={step === 1} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                {attendeeType === "designer" ? (
                  <label className="mt-4 block text-sm font-semibold text-gray-800">
                    Fashion brand or business name <span className="font-medium text-gray-500">(optional)</span>
                    <input value={brandName} onChange={(e) => setBrandName(e.target.value)} disabled={paymentLocked} className={inputClass} />
                  </label>
                ) : null}
              </div>

              <div className={step === 2 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">3. Payment</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  Members pay {formatForumFeeKes(KCM_FORUM_MEMBER_FEE_KES)}. Non-members pay {formatForumFeeKes(KCM_FORUM_NON_MEMBER_FEE_KES)}. Your fee is
                  based on the membership option you selected.
                </p>
                <p className="mt-3 text-2xl font-bold text-secondary-800">{feeKes == null ? "Select membership first" : formatForumFeeKes(feeKes)}</p>
                <p className="mt-1 text-sm text-gray-600">{isMember === "yes" ? "Member fee" : isMember === "no" ? "Non-member fee" : ""}</p>
                <label className="mt-4 block text-sm font-semibold text-gray-800">
                  M-Pesa number for the prompt <span className="text-negative">*</span>
                  <input
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    type="tel"
                    disabled={paymentLocked}
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void sendPrompt()}
                  disabled={paying || paymentStatus === "success" || paymentStatus === "pending"}
                  className="mt-4 flex min-h-12 w-full items-center justify-center rounded-lg bg-secondary-700 px-4 text-sm font-bold text-white hover:bg-secondary-800 disabled:opacity-60"
                >
                  {paying ? "Sending prompt…" : paymentStatus === "success" ? "Payment received" : "Send M-Pesa prompt"}
                </button>
                {paymentNote ? <p className="mt-3 text-sm text-gray-700">{paymentNote}</p> : null}
              </div>

              <div className={step === 3 ? undefined : "hidden"}>
                <h2 className="text-left text-lg font-bold text-gray-900 sm:text-xl lg:text-center lg:text-lg">4. Confirmation</h2>
                <label className="mt-4 flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    required={step === 3}
                    className="mt-1 h-5 w-5 shrink-0"
                  />
                  <span>
                    I confirm that the details provided are accurate and that I have paid the applicable attendance fee.
                    <span className="text-negative"> *</span>
                  </span>
                </label>
              </div>

              {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

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
                    className="flex min-h-12 flex-1 items-center justify-center rounded-lg bg-secondary-700 px-4 text-sm font-bold text-white hover:bg-secondary-800 disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Complete Registration"}
                  </button>
                )}
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
