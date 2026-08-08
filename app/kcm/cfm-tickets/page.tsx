"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import {
  PaymentClientError,
  messageForPaymentFailure,
} from "@/lib/payment-user-message";
import { normalizeKenyaPhone } from "@/lib/kenya-phone";
import { DARAJA_CLIENT_VERIFY_MIN_AGE_MS } from "@/lib/daraja-stk-result";
import CfmTicketsPosterCarousel from "@/components/cfm-tickets/CfmTicketsPosterCarousel";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { cfmTicketsJsonLd } from "./structured-data";

type TicketPackage = {
  name: string;
  slug: string;
  amount: number;
  perks: string[];
};

const packages: TicketPackage[] = [
  {
    name: "Regular",
    slug: "cfma-2026",
    amount: 500,
    perks: ["Entry for one guest", "General seating", "Event wristband"],
  },
  {
    name: "VIP",
    slug: "cfma-2026-vip",
    amount: 1500,
    perks: ["Priority entry", "Reserved seating zone", "Complimentary refreshment"],
  },
  {
    name: "VVIP",
    slug: "cfma-2026-vvip",
    amount: 3500,
    perks: ["Front-row experience", "VIP lounge access", "Meet & greet opportunity"],
  },
];

/** Set true to show the Lipa Pole Pole installment block on checkout again. */
const SHOW_LIPA_POLE_POLE_UI = false;

export default function CfmTicketsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submittingMethod, setSubmittingMethod] = useState<"daraja" | "paystack" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    null | { status: string; provider: string | null; amount: number | null; currency: string | null; quantity: number | null }
  >(null);

  const [installmentPlanId, setInstallmentPlanId] = useState<string | null>(null);
  const [installmentDeposit, setInstallmentDeposit] = useState("");
  /** Optional: use a different phone/name only for “Check my balance” (top-ups / returning payers). */
  const [balanceLookupPhone, setBalanceLookupPhone] = useState("");
  const [installmentLookup, setInstallmentLookup] = useState<null | {
    balance_kes: number;
    total_due_kes: number;
    amount_paid_kes: number;
    ticket_quantity: number;
  }>(null);
  const [installmentLookupLoading, setInstallmentLookupLoading] = useState(false);
  const [installmentPayLoading, setInstallmentPayLoading] = useState<"daraja" | "paystack" | null>(null);

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.amount === selectedAmount) ?? packages[0],
    [selectedAmount]
  );

  const payerName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;
  const normalizedQuantity = Math.max(1, Math.min(10000, Math.trunc(Number(quantity) || 1)));

  // Keep selected package stable when quantity changes. Selection only changes
  // when the user explicitly clicks a package button.

  useEffect(() => {
    setInstallmentPlanId(null);
    setInstallmentLookup(null);
    setInstallmentDeposit("");
    setBalanceLookupPhone("");
  }, [selectedAmount, normalizedQuantity]);

  const openCheckout = (amount: number) => {
    setSelectedAmount(amount);
    setError(null);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    if (submittingMethod || installmentPayLoading) return;
    setCheckoutOpen(false);
  };

  useEffect(() => {
    if (!checkoutOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (submittingMethod || installmentPayLoading) return;
      setCheckoutOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [checkoutOpen, submittingMethod, installmentPayLoading]);

  const validateCommon = () => {
    if (!firstName.trim() || !lastName.trim()) {
      throw new PaymentClientError("Enter first and last name.");
    }
    if (!email.trim()) {
      throw new PaymentClientError("Email is required.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new PaymentClientError("Enter a valid email address.");
    }
    const phoneNorm = normalizeKenyaPhone(phone);
    if (!phoneNorm || !/^254[17]\d{8}$/.test(phoneNorm)) {
      throw new PaymentClientError(
        "Enter a valid Kenya phone number (e.g. 0712345678 or 254712345678)."
      );
    }
    if (!agreedToTerms) {
      throw new PaymentClientError("Please agree to Terms and Conditions before payment.");
    }
  };

  const handlePaystack = async () => {
    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedPackage.slug,
        email: email.trim(),
        payer_name: payerName,
        payer_phone: normalizeKenyaPhone(phone),
        quantity: normalizedQuantity,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      authorization_url?: string;
      reference?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new PaymentClientError(json.error ?? "Card payment could not be started.");
    }
    if (json.authorization_url) {
      window.location.href = json.authorization_url;
      return;
    }
    if (json.reference) {
      window.location.href = `/receipt?ref=${encodeURIComponent(json.reference)}`;
      return;
    }
    throw new PaymentClientError("Card checkout did not return a payment link. Please try again.");
  };

  const handleDaraja = async () => {
    const res = await fetch("/api/daraja/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedPackage.slug,
        phone: normalizeKenyaPhone(phone),
        email: email.trim(),
        payer_name: payerName,
        quantity: normalizedQuantity,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      reference?: string;
      message?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new PaymentClientError(json.error ?? "M-Pesa payment could not be started.");
    }
    if (json.reference) {
      setPendingReference(json.reference);
      setPaymentStatus({
        status: "pending",
        provider: "daraja",
        amount: selectedPackage.amount * normalizedQuantity,
        currency: "KES",
        quantity: normalizedQuantity,
      });
      setNotice("M-Pesa prompt sent. Complete payment on your phone. Status will update automatically.");
      return;
    }
    setNotice(json.message ?? "M-Pesa prompt sent. Check your phone to complete payment.");
  };

  const validateBalanceLookupIdentifiers = () => {
    const phoneFromForm = normalizeKenyaPhone(phone);
    const phoneOverride = balanceLookupPhone.trim()
      ? normalizeKenyaPhone(balanceLookupPhone)
      : "";
    const phoneNorm = phoneOverride || phoneFromForm;
    const emailTrim = email.trim();
    const phoneOk = /^254[17]\d{8}$/.test(phoneNorm);
    if (!phoneOk && !emailTrim) {
      throw new PaymentClientError(
        "To check your balance, enter your Kenya phone or your email as used when you started Lipa Pole Pole."
      );
    }
  };

  const lookupInstallmentBalance = async () => {
    setInstallmentLookupLoading(true);
    setError(null);
    setNotice(null);
    try {
      validateBalanceLookupIdentifiers();
      const phoneFromForm = normalizeKenyaPhone(phone);
      const phoneOverride = balanceLookupPhone.trim()
        ? normalizeKenyaPhone(balanceLookupPhone)
        : "";
      const phoneNorm = phoneOverride || phoneFromForm;
      const res = await fetch("/api/cfm-tickets/installment/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedPackage.slug,
          email: email.trim(),
          phone: phoneNorm,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        found?: boolean;
        error?: string;
        plan_id?: string;
        balance_kes?: number;
        total_due_kes?: number;
        amount_paid_kes?: number;
        ticket_quantity?: number;
      };
      if (!res.ok) throw new PaymentClientError(j.error ?? "Lookup failed.");
      if (!j.found) {
        setInstallmentPlanId(null);
        setInstallmentLookup(null);
        setNotice(
          "No Lipa Pole Pole plan found for this package and details. Pick the same tier as before, then try phone, email, or name—or start a plan with your first payment below."
        );
        return;
      }
      setInstallmentPlanId(j.plan_id ?? null);
      setInstallmentLookup({
        balance_kes: Number(j.balance_kes ?? 0),
        total_due_kes: Number(j.total_due_kes ?? 0),
        amount_paid_kes: Number(j.amount_paid_kes ?? 0),
        ticket_quantity: Number(j.ticket_quantity ?? normalizedQuantity),
      });
      setNotice(null);
    } catch (err) {
      setError(messageForPaymentFailure(err));
    } finally {
      setInstallmentLookupLoading(false);
    }
  };

  const ensureInstallmentPlanId = async (): Promise<{
    planId: string;
    balanceKes: number;
    amountPaidKes: number;
  }> => {
    const res = await fetch("/api/cfm-tickets/installment/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedPackage.slug,
        email: email.trim(),
        phone: normalizeKenyaPhone(phone),
        payer_name: payerName,
        ticket_quantity: normalizedQuantity,
      }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      plan_id?: string;
      balance_kes?: number;
      total_due_kes?: number;
      amount_paid_kes?: number;
      ticket_quantity?: number;
    };
    if (!res.ok) throw new PaymentClientError(j.error ?? "Could not start Lipa Pole Pole plan.");
    if (!j.plan_id) throw new PaymentClientError("Invalid response from server.");
    setInstallmentPlanId(j.plan_id);
    const paid = Number(j.amount_paid_kes ?? 0);
    setInstallmentLookup({
      balance_kes: Number(j.balance_kes ?? 0),
      total_due_kes: Number(j.total_due_kes ?? 0),
      amount_paid_kes: paid,
      ticket_quantity: Number(j.ticket_quantity ?? normalizedQuantity),
    });
    return { planId: j.plan_id, balanceKes: Number(j.balance_kes ?? 0), amountPaidKes: paid };
  };

  const handleInstallmentDaraja = async () => {
    validateCommon();
    const { planId, amountPaidKes, balanceKes } = await ensureInstallmentPlanId();
    if (amountPaidKes === 0) {
      const raw = installmentDeposit.trim();
      if (!raw) {
        throw new PaymentClientError(
          "Enter your first payment amount in KES (minimum 50) under Lipa Pole Pole. You can pay the rest later."
        );
      }
      const first = Math.trunc(Number(raw));
      if (!Number.isFinite(first) || first < 50) {
        throw new PaymentClientError("First Lipa payment must be at least KES 50.");
      }
      if (first > balanceKes) {
        throw new PaymentClientError(`First payment cannot exceed your balance (KES ${balanceKes.toLocaleString()}).`);
      }
    }
    let depositKes: number | undefined;
    if (installmentDeposit.trim()) {
      depositKes = Math.trunc(Number(installmentDeposit));
      if (!Number.isFinite(depositKes) || depositKes < 1) {
        throw new PaymentClientError("Enter a valid installment amount (KES), or leave blank to pay the full remaining balance.");
      }
    }
    const res = await fetch("/api/daraja/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedPackage.slug,
        phone: normalizeKenyaPhone(phone),
        email: email.trim(),
        payer_name: payerName,
        quantity: normalizedQuantity,
        lipa_pole_pole_plan_id: planId,
        ...(depositKes != null ? { lipa_pole_pole_deposit_kes: depositKes } : {}),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      reference?: string;
      message?: string;
      error?: string;
    };
    if (!res.ok) throw new PaymentClientError(json.error ?? "M-Pesa installment could not be started.");
    if (json.reference) {
      setPendingReference(json.reference);
      setPaymentStatus({
        status: "pending",
        provider: "daraja",
        amount: depositKes ?? installmentLookup?.balance_kes ?? null,
        currency: "KES",
        quantity: normalizedQuantity,
      });
      setNotice("M-Pesa prompt sent for your Lipa Pole Pole installment. Complete payment on your phone.");
      return;
    }
    setNotice(json.message ?? "M-Pesa prompt sent. Check your phone to complete payment.");
  };

  const handleInstallmentPaystack = async () => {
    validateCommon();
    const { planId, amountPaidKes, balanceKes } = await ensureInstallmentPlanId();
    if (amountPaidKes === 0) {
      const raw = installmentDeposit.trim();
      if (!raw) {
        throw new PaymentClientError(
          "Enter your first payment amount in KES (minimum 50) under Lipa Pole Pole. You can pay the rest later."
        );
      }
      const first = Math.trunc(Number(raw));
      if (!Number.isFinite(first) || first < 50) {
        throw new PaymentClientError("First Lipa payment must be at least KES 50.");
      }
      if (first > balanceKes) {
        throw new PaymentClientError(`First payment cannot exceed your balance (KES ${balanceKes.toLocaleString()}).`);
      }
    }
    let depositKes: number | undefined;
    if (installmentDeposit.trim()) {
      depositKes = Math.trunc(Number(installmentDeposit));
      if (!Number.isFinite(depositKes) || depositKes < 1) {
        throw new PaymentClientError("Enter a valid installment amount (KES), or leave blank to pay the full remaining balance.");
      }
    }
    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedPackage.slug,
        email: email.trim(),
        payer_name: payerName,
        payer_phone: normalizeKenyaPhone(phone),
        quantity: normalizedQuantity,
        lipa_pole_pole_plan_id: planId,
        ...(depositKes != null ? { lipa_pole_pole_deposit_kes: depositKes } : {}),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      authorization_url?: string;
      reference?: string;
      error?: string;
    };
    if (!res.ok) throw new PaymentClientError(json.error ?? "Paystack could not start.");
    if (json.authorization_url) {
      window.location.href = json.authorization_url;
      return;
    }
    if (json.reference) {
      window.location.href = `/receipt?ref=${encodeURIComponent(json.reference)}`;
      return;
    }
    throw new Error("Missing Paystack authorization URL");
  };

  const onInstallmentPay = async (method: "daraja" | "paystack") => {
    if (installmentPayLoading) return;
    setError(null);
    setNotice(null);
    setInstallmentPayLoading(method);
    try {
      if (method === "daraja") {
        await handleInstallmentDaraja();
      } else {
        await handleInstallmentPaystack();
      }
    } catch (err) {
      setError(messageForPaymentFailure(err));
    } finally {
      setInstallmentPayLoading(null);
    }
  };

  const onPay = async (method: "daraja" | "paystack") => {
    if (submittingMethod) return;
    setError(null);
    setNotice(null);
    setSubmittingMethod(method);
    try {
      validateCommon();
      if (method === "daraja") {
        await handleDaraja();
      } else {
        await handlePaystack();
      }
    } catch (err) {
      setError(messageForPaymentFailure(err));
    } finally {
      setSubmittingMethod(null);
    }
  };

  useEffect(() => {
    if (!pendingReference) return;

    let cancelled = false;
    const darajaVerifyEligibleAt = Date.now() + DARAJA_CLIENT_VERIFY_MIN_AGE_MS;

    const pollStatus = async () => {
      try {
        let res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(pendingReference)}`, {
          cache: "no-store",
        });
        let json = (await res.json().catch(() => ({}))) as {
          status?: string;
          provider?: string | null;
          amount?: number | null;
          currency?: string | null;
          quantity?: number | null;
        };
        if (!res.ok) return;

        if (
          String(json.status ?? "pending") === "pending" &&
          String(json.provider ?? "").toLowerCase() === "daraja" &&
          Date.now() >= darajaVerifyEligibleAt
        ) {
          await fetch("/api/daraja/verify-ref", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ref: pendingReference }),
          }).catch(() => {});

          res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(pendingReference)}`, {
            cache: "no-store",
          });
          json = (await res.json().catch(() => ({}))) as typeof json;
          if (!res.ok) return;
        }

        if (cancelled) return;
        const status = String(json.status ?? "pending");
        setPaymentStatus({
          status,
          provider: json.provider ?? null,
          amount: typeof json.amount === "number" ? json.amount : null,
          currency: json.currency ?? null,
          quantity: typeof json.quantity === "number" ? json.quantity : null,
        });

        if (status === "success") {
          setNotice("Payment confirmed successfully. You can open your receipt now.");
          if (intervalId) window.clearInterval(intervalId);
        } else if (status === "failed" || status === "abandoned") {
          setError("Payment was not completed. You can retry payment.");
          if (intervalId) window.clearInterval(intervalId);
        }
      } catch {
        // Keep polling quietly.
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(pollStatus, 2000);

    const stopTimeout = window.setTimeout(() => {
      window.clearInterval(intervalId);
    }, 300000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(stopTimeout);
    };
  }, [pendingReference]);

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '443925778134913'); fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <Image
          height={1}
          width={1}
          src="https://www.facebook.com/tr?id=443925778134913&ev=PageView&noscript=1"
          alt="Facebook Pixel"
          unoptimized
        />
      </noscript>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cfmTicketsJsonLd) }}
      />
      <main className="relative min-h-screen overflow-x-clip bg-gray-50 pb-8 pt-28 max-md:pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-10 md:pb-16 md:pt-36">
        <section aria-labelledby="cfm-tickets-heading" className="relative z-10">
          {/* Full-bleed hero (white background, Changer Fusions accents) */}
          <div className="md:relative md:ml-[calc(50%-50vw)] md:w-screen bg-white border-b border-gray-200">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid items-center gap-5 py-5 sm:gap-8 sm:py-11 md:grid-cols-2 md:gap-10 md:py-14">
                <div className="min-w-0 text-center md:text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary-700 sm:text-sm">
                    Official CFM Awards tickets
                  </p>
                  <h1
                    id="cfm-tickets-heading"
                    className="mt-1.5 text-[1.65rem] font-extrabold leading-[1.15] tracking-tight text-gray-900 sm:mt-2 sm:text-4xl md:text-5xl text-center md:text-left"
                  >
                    Buy CFM Tickets — Coast Fashion Awards 2026
                  </h1>
                  <div className="mt-3 text-sm font-semibold text-gray-700 sm:text-base text-center md:text-left">
                    <p className="hidden sm:block">
                      Coast Fashion &amp; Modelling Awards (CFMA) · City Blue Creekside Hotel, Mombasa · 15 Aug 2026 ·
                      7:00 PM
                    </p>
                    <div className="space-y-1 sm:hidden">
                      <p className="text-[13px] leading-snug">Coast Fashion &amp; Modelling Awards (CFMA)</p>
                      <p className="text-[13px] font-medium leading-snug text-gray-600">
                        City Blue Creekside Hotel, Mombasa
                      </p>
                      <p className="text-[13px] font-medium leading-snug text-gray-600">15 Aug 2026 · 7:00 PM</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:justify-center sm:gap-3 md:justify-start">
                    <a
                      href="#packages"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 active:scale-[0.99] sm:min-h-[44px] sm:rounded-lg"
                    >
                      Buy tickets
                    </a>
                    <a
                      href="#packages"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-primary-200 bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-100 max-md:hidden sm:rounded-lg"
                    >
                      View packages
                    </a>
                  </div>
                </div>

                <div className="relative flex w-full justify-center md:justify-end">
                  <div className="relative aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg sm:max-w-[360px] sm:rounded-2xl sm:shadow-2xl md:max-w-[520px]">
                    <Image
                      loader={cloudinaryLoader}
                      src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1785146685/WhatsApp_Image_2026-07-23_at_15.55.25_2_nv8rm3.jpg"
                      alt="Coast Fashion & Modelling Awards 2026 ticket poster"
                      fill
                      className="object-contain object-center"
                      sizes="(max-width: 640px) 220px, (max-width: 768px) 360px, 520px"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="packages" className="scroll-mt-28 sm:scroll-mt-36" />

          {/* Desktop: full-viewport-width white panel for checkout */}
          <div className="min-w-0 md:relative md:ml-[calc(50%-50vw)] md:w-screen md:bg-white md:pb-12">
            <div className="mx-auto w-full max-w-7xl px-0 sm:px-6 lg:px-8">
              <article className="w-full min-w-0 overflow-hidden bg-white max-md:max-w-none max-md:rounded-none md:mt-8 md:mr-auto md:ml-0 md:max-w-5xl">
            <div className="bg-white px-4 py-4 sm:p-5 md:p-7">
                <h2 className="mb-3 text-base font-extrabold text-gray-900 sm:mb-4 sm:text-lg md:sr-only">
                  Choose your package
                </h2>
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                    {packages.map((pkg) => {
                    const isSelected = checkoutOpen && selectedPackage.amount === pkg.amount;
                    return (
                      <button
                        key={pkg.amount}
                        type="button"
                        onClick={() => openCheckout(pkg.amount)}
                        className={`touch-manipulation rounded-2xl border bg-white p-4 text-left shadow-sm transition active:scale-[0.99] sm:rounded-2xl sm:p-5 ${
                          isSelected
                            ? "border-primary-600 bg-primary-50 ring-2 ring-primary-400/80 shadow-md"
                            : "border-gray-200 hover:border-primary-300 hover:bg-amber-50/90 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-primary-700 sm:text-xs">
                              {pkg.name}
                            </p>
                            <p className="mt-1 text-2xl font-extrabold text-gray-900 sm:mt-2 sm:text-3xl">
                              KES {pkg.amount.toLocaleString()}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg border px-3 py-2 text-center text-xs font-semibold md:hidden ${
                              isSelected
                                ? "border-primary-500 bg-primary-600 text-white"
                                : "border-primary-200 bg-primary-50 text-primary-800"
                            }`}
                          >
                            {isSelected ? "Open" : "Select"}
                          </span>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-xs text-gray-700 sm:mt-4 sm:space-y-2 sm:text-sm">
                          {pkg.perks.map((perk) => (
                            <li key={perk} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />
                              <span className="leading-snug">{perk}</span>
                            </li>
                          ))}
                        </ul>
                        <span
                          className={`mt-4 hidden w-full min-h-[44px] items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition md:flex ${
                            isSelected
                              ? "border-primary-500 bg-primary-600 text-white"
                              : "border-primary-200 bg-primary-50/80 text-primary-800"
                          }`}
                        >
                          {isSelected ? "Checkout open" : "Select & pay"}
                        </span>
                      </button>
                    );
                  })}
                  </div>

                {!checkoutOpen && pendingReference ? (
                  <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-3 py-3 text-sm text-primary-900">
                    <p className="font-semibold">Payment in progress</p>
                    <p className="mt-0.5 break-all text-xs sm:text-sm">Ref: {pendingReference}</p>
                    <button
                      type="button"
                      onClick={() => setCheckoutOpen(true)}
                      className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-primary-300 bg-white px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 sm:text-sm"
                    >
                      Reopen checkout
                    </button>
                  </div>
                ) : null}
            </div>

            {checkoutOpen ? (
              <div
                className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:bg-black/50 sm:p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cfm-tickets-checkout-title"
                onClick={closeCheckout}
              >
                <div
                  className="flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-h-[min(92dvh,900px)] sm:rounded-2xl pb-[env(safe-area-inset-bottom)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
                    <span className="h-1 w-10 rounded-full bg-gray-300" />
                  </div>
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5 sm:py-4">
                    <div className="min-w-0">
                      <h2
                        id="cfm-tickets-checkout-title"
                        className="text-base font-extrabold text-gray-900 sm:text-lg"
                      >
                        Checkout
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-primary-700 sm:text-sm">
                        {(() => {
                          const total = selectedPackage.amount * normalizedQuantity;
                          if (normalizedQuantity > 1) {
                            return (
                              <>
                                {selectedPackage.name} — KES {total.toLocaleString()}{" "}
                                <span className="font-medium text-gray-600">
                                  ({selectedPackage.amount.toLocaleString()} / ticket)
                                </span>
                              </>
                            );
                          }
                          return (
                            <>
                              {selectedPackage.name} — KES {selectedPackage.amount.toLocaleString()}
                            </>
                          );
                        })()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={closeCheckout}
                      disabled={submittingMethod !== null || installmentPayLoading !== null}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 sm:h-9 sm:w-9 sm:rounded-lg"
                      aria-label="Close checkout"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void onPay("daraja");
                    }}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden text-sm"
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:p-5">

              {error ? (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-red-700">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm leading-snug text-green-700">
                  {notice}
                </div>
              ) : null}
              {pendingReference && paymentStatus ? (
                <div className="mb-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-3 text-sm text-primary-900">
                  <p className="break-all font-semibold text-xs sm:text-sm">Payment reference: {pendingReference}</p>
                  <p className="mt-0.5 text-xs sm:text-sm">
                    Status:{" "}
                    <span className="font-bold uppercase">
                      {paymentStatus.status === "success"
                        ? "Success"
                        : paymentStatus.status === "failed" || paymentStatus.status === "abandoned"
                          ? "Failed"
                          : "Pending"}
                    </span>
                  </p>
                  {paymentStatus.amount != null ? (
                    <p className="mt-0.5 text-xs sm:text-sm">
                      Amount: {paymentStatus.currency ?? "KES"} {paymentStatus.amount.toLocaleString()}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <a
                      href={`/receipt?ref=${encodeURIComponent(pendingReference)}`}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-primary-300 bg-white px-3 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100 sm:text-sm"
                    >
                      Open receipt
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  autoComplete="given-name"
                  className="min-w-0 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:rounded-lg sm:py-2.5 sm:text-sm"
                  required
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  autoComplete="family-name"
                  className="min-w-0 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:rounded-lg sm:py-2.5 sm:text-sm"
                  required
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  inputMode="email"
                  className="col-span-full min-w-0 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:rounded-lg sm:py-2.5 sm:text-sm"
                  required
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (e.g. 0712… or 254712…)"
                  autoComplete="tel"
                  inputMode="tel"
                  className="col-span-full min-w-0 w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:rounded-lg sm:py-2.5 sm:text-sm"
                  required
                  aria-describedby="cfm-tickets-phone-hint"
                />
                <p
                  id="cfm-tickets-phone-hint"
                  className="col-span-full text-xs leading-snug text-gray-500"
                >
                  Required for all payments. M-Pesa uses this number for the STK prompt.
                </p>
                <label className="col-span-full block">
                  <span className="mb-1 block text-xs font-semibold text-gray-700">Quantity</span>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={normalizedQuantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    placeholder="Quantity"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:rounded-lg sm:py-2.5 sm:text-sm"
                    required
                  />
                </label>
              </div>

              <label className="mt-4 flex items-start gap-3 text-sm leading-snug text-gray-700">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-700 underline"
                  >
                    Terms and Conditions
                  </a>
                  .
                </span>
              </label>

              {SHOW_LIPA_POLE_POLE_UI ? (
                <>
                  <div
                    className="mt-4 flex items-center gap-3 max-md:mt-3"
                    role="separator"
                    aria-label="Alternative payment option"
                  >
                    <span className="h-px flex-1 bg-gray-300" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 max-md:text-[10px]">
                      OR
                    </span>
                    <span className="h-px flex-1 bg-gray-300" />
                  </div>

                  <div className="mt-4 rounded-xl border border-white/25 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 p-3 sm:p-4 max-md:mt-3 max-md:p-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white sm:text-base">Lipa Pole Pole</h3>
                      <p className="mt-1 text-xs leading-snug text-white/90 sm:text-sm">
                        Choose your package with the tiers above (KES 500–3,500).
                      </p>
                      <p className="mt-2 text-xs font-semibold text-white sm:text-sm">First payment</p>
                      <input
                        type="number"
                        min={50}
                        value={installmentDeposit}
                        onChange={(e) => setInstallmentDeposit(e.target.value)}
                        placeholder="First payment (KES), min 50 — required until you have paid before"
                        inputMode="numeric"
                        className="mt-1 w-full rounded-lg border border-white/40 bg-white px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-500 focus:border-white focus:ring-2 focus:ring-white/40 sm:text-sm max-md:px-2.5"
                      />
                      <p className="mt-3 text-xs font-semibold text-white sm:text-sm">
                        Returning / top-up — verify your balance
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/85 sm:text-xs max-md:text-[11px]">
                        Use the phone you used when you started Lipa Pole Pole (optional if already filled in
                        checkout).
                      </p>
                      <div className="mt-2 grid gap-2 sm:gap-3">
                        <input
                          type="tel"
                          value={balanceLookupPhone}
                          onChange={(e) => setBalanceLookupPhone(e.target.value)}
                          placeholder="Phone for lookup (optional)"
                          autoComplete="tel"
                          inputMode="tel"
                          className="w-full rounded-lg border border-white/40 bg-white px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-500 focus:border-white focus:ring-2 focus:ring-white/40 sm:text-sm max-md:px-2.5"
                        />
                      </div>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => void lookupInstallmentBalance()}
                          disabled={installmentLookupLoading}
                          className="touch-manipulation w-full min-h-[44px] rounded-lg border border-white/70 bg-white/15 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 sm:text-sm sm:max-w-xs disabled:opacity-60 max-md:flex max-md:items-center max-md:justify-center"
                        >
                          {installmentLookupLoading ? (
                            <span className="inline-flex items-center justify-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking…
                            </span>
                          ) : (
                            "Check my balance"
                          )}
                        </button>
                      </div>
                      {installmentLookup ? (
                        <p className="mt-2 break-words rounded-md bg-white px-2 py-1.5 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-white/50 sm:text-sm">
                          Balance: <strong>KES {installmentLookup.balance_kes.toLocaleString()}</strong> of total{" "}
                          <strong>KES {installmentLookup.total_due_kes.toLocaleString()}</strong> (paid KES{" "}
                          {installmentLookup.amount_paid_kes.toLocaleString()} ·{" "}
                          {installmentLookup.ticket_quantity} ticket
                          {installmentLookup.ticket_quantity === 1 ? "" : "s"})
                        </p>
                      ) : null}
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => void onInstallmentPay("daraja")}
                          disabled={installmentPayLoading !== null}
                          aria-label="M-Pesa Lipa Pole Pole installment payment"
                          className="touch-manipulation inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-1.5 rounded-lg bg-green-700 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-800 sm:min-h-11 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {installmentPayLoading === "daraja" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Starting…
                            </>
                          ) : (
                            <span className="text-center leading-tight">M-Pesa · Lipa Pole Pole</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onInstallmentPay("paystack")}
                          disabled={installmentPayLoading !== null}
                          aria-label="Card or Paystack Lipa Pole Pole installment payment"
                          className="touch-manipulation inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-1.5 rounded-lg bg-teal-800 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-900 sm:min-h-11 sm:px-3 sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {installmentPayLoading === "paystack" ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Redirecting…
                            </>
                          ) : (
                            <span className="text-center leading-tight">Card / Paystack · Lipa Pole Pole</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
                    </div>

                    <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
                      <div className="grid grid-cols-1 gap-2.5 min-[400px]:grid-cols-2">
                        <button
                          type="submit"
                          disabled={submittingMethod !== null}
                          aria-label="Pay with M-Pesa"
                          className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 active:bg-green-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {submittingMethod === "daraja" ? (
                            <>
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              Processing…
                            </>
                          ) : (
                            "Pay with M-Pesa"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onPay("paystack")}
                          disabled={submittingMethod !== null}
                          aria-label="Pay with Card or Paystack"
                          className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-800 active:bg-primary-900 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {submittingMethod === "paystack" ? (
                            <>
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              Redirecting…
                            </>
                          ) : (
                            "Pay with Card"
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
              </article>
            </div>

          <CfmTicketsPosterCarousel />
          </div>
        </section>
      </main>
    </>
  );
}
