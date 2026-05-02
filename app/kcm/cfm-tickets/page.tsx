"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  PaymentClientError,
  messageForPaymentFailure,
} from "@/lib/payment-user-message";
import { validateReferredByNameOnly } from "@/lib/referred-by-name-only";
import CfmTicketsPosterCarousel from "@/components/cfm-tickets/CfmTicketsPosterCarousel";
import { cfmTicketsJsonLd } from "./structured-data";

/** Normalize to Kenya 254XXXXXXXXX for M-Pesa / stored payer phone. */
function normalizeKenyaPhone(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0") && phoneRaw.length >= 10) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9 && /^[17]/.test(phoneRaw)) return `254${phoneRaw}`;
  return phoneRaw;
}

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

export default function CfmTicketsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [referredBy, setReferredBy] = useState("");
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
  const [balanceLookupName, setBalanceLookupName] = useState("");
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

  useEffect(() => {
    setInstallmentPlanId(null);
    setInstallmentLookup(null);
    setInstallmentDeposit("");
    setBalanceLookupPhone("");
    setBalanceLookupName("");
  }, [selectedAmount, normalizedQuantity]);

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
    const refErr = validateReferredByNameOnly(referredBy);
    if (refErr) throw new PaymentClientError(refErr);
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
        ...(referredBy.trim() ? { referred_by: referredBy.trim().slice(0, 240) } : {}),
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      authorization_url?: string;
      reference?: string;
    };
    if (!res.ok) throw new Error("Paystack initialize failed");
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
        ...(referredBy.trim() ? { referred_by: referredBy.trim().slice(0, 240) } : {}),
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      reference?: string;
      message?: string;
    };
    if (!res.ok) throw new Error("Daraja STK push failed");
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
    const nameTrim = balanceLookupName.trim();
    const phoneOk = /^254[17]\d{8}$/.test(phoneNorm);
    if (!phoneOk && !emailTrim && nameTrim.length < 2) {
      throw new PaymentClientError(
        "To check your balance, enter your Kenya phone, your email, or your name as used when you started Lipa Pole Pole (at least 2 characters)."
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
          ...(balanceLookupName.trim().length >= 2
            ? { verify_name: balanceLookupName.trim() }
            : {}),
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
        ...(referredBy.trim() ? { referred_by: referredBy.trim().slice(0, 240) } : {}),
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
        ...(referredBy.trim() ? { referred_by: referredBy.trim().slice(0, 240) } : {}),
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
        ...(referredBy.trim() ? { referred_by: referredBy.trim().slice(0, 240) } : {}),
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
    let interval: number | undefined;

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
          String(json.provider ?? "").toLowerCase() === "daraja"
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
          if (interval) window.clearInterval(interval);
        } else if (status === "failed" || status === "abandoned") {
          setError("Payment was not completed. You can retry payment.");
          if (interval) window.clearInterval(interval);
        }
      } catch {
        // Keep polling quietly.
      }
    };

    void pollStatus();
    interval = window.setInterval(pollStatus, 2000);

    const stopTimeout = window.setTimeout(() => {
      if (interval) window.clearInterval(interval);
    }, 300000);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      window.clearTimeout(stopTimeout);
    };
  }, [pendingReference]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cfmTicketsJsonLd) }}
      />
      <main className="relative min-h-screen overflow-x-clip max-md:bg-gray-100 pb-8 pt-32 max-md:pt-36 md:pt-36 sm:pb-10 md:pb-16 max-md:pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* Hero photo + overlay: desktop only; mobile uses flat background */}
        <div
          className="pointer-events-none absolute inset-0 hidden bg-cover bg-center bg-no-repeat md:block"
          style={{
            backgroundImage:
              "url('https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg')",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 hidden bg-black/25 md:block" aria-hidden />

        <section className="relative z-10 mt-3 min-w-0 max-md:mx-0 max-md:mt-2 max-md:max-w-none max-md:px-0 sm:mt-4 md:mt-6 md:w-full md:max-w-none md:px-0">
          {/* Desktop: full-viewport-width white panel so the hero image never shows beside this page */}
          <div className="min-w-0 md:relative md:ml-[calc(50%-50vw)] md:w-screen md:bg-white md:pb-12">
          <article className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden border border-white/35 bg-white shadow-2xl max-md:max-w-none max-md:rounded-none max-md:border-x-0 max-md:border-gray-200 max-md:shadow-none md:rounded-2xl md:border-x md:border-white/35 md:shadow-2xl lg:rounded-3xl">
            <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 px-4 py-4 text-white max-[360px]:px-3 max-[360px]:py-3 sm:px-6 sm:py-5 md:px-8 md:py-6 max-md:py-3.5 max-md:px-4">
              <h1
                id="cfm-tickets-heading"
                className="scroll-mt-36 text-lg font-extrabold leading-tight max-[360px]:text-base sm:text-2xl md:text-3xl max-md:font-bold max-md:leading-snug"
              >
                Choose Your Ticket Package
              </h1>
            </div>

            {/* Mobile: ≤320px single-column tiers; wider mobile keeps 3 cols with capped height */}
            <div className="bg-white p-3 max-[360px]:p-2.5 sm:p-5 md:p-7 max-md:px-0 max-md:py-2 max-md:pb-2">
                <div className="max-md:flex max-md:flex-col max-md:min-h-0 max-md:max-h-[min(52dvh,26rem)] max-[320px]:max-h-none max-[320px]:overflow-visible min-[321px]:max-md:overflow-y-auto">
                  <div className="grid grid-cols-1 gap-3 max-[360px]:gap-2.5 sm:gap-4 min-[321px]:max-md:grid-cols-3 md:grid-cols-3 min-[321px]:max-md:gap-2 max-md:px-2 max-md:min-h-0 max-md:flex-1 min-[321px]:max-md:auto-rows-fr max-[320px]:auto-rows-auto">
                    {packages.map((pkg) => {
                    const isSelected = selectedPackage.amount === pkg.amount;
                    return (
                      <button
                        key={pkg.amount}
                        type="button"
                        onClick={() => setSelectedAmount(pkg.amount)}
                        className={`touch-manipulation rounded-xl border bg-white p-3 max-[360px]:p-2.5 text-left shadow-sm transition sm:rounded-2xl sm:p-5 max-md:flex max-md:min-h-0 max-md:flex-col max-md:rounded-lg max-md:p-2.5 max-md:py-3 min-[321px]:max-md:h-full max-[320px]:h-auto ${
                          isSelected
                            ? "border-primary-600 bg-primary-50 ring-2 ring-primary-400/80 shadow-md max-md:border-primary-600 max-md:bg-primary-600/15 max-md:ring-2 max-md:ring-primary-500"
                            : "border-gray-200 hover:border-primary-300 hover:bg-amber-50/90 hover:shadow-md max-md:hover:bg-amber-50"
                        }`}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700 max-[360px]:text-[10px] sm:text-xs max-md:text-[10px] max-md:leading-tight">
                          {pkg.name}
                        </p>
                        <p className="mt-2 text-xl font-extrabold text-gray-900 max-[360px]:text-lg sm:text-3xl max-md:mt-1 max-md:text-base max-md:leading-none">
                          KES {pkg.amount.toLocaleString()}
                        </p>
                        <ul className="mt-3 space-y-1.5 text-xs text-gray-700 max-[360px]:mt-2.5 max-[360px]:space-y-1 max-[360px]:text-[11px] sm:mt-4 sm:space-y-2 sm:text-sm max-md:hidden">
                          {pkg.perks.map((perk) => (
                            <li key={perk} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" />
                              <span>{perk}</span>
                            </li>
                          ))}
                        </ul>
                        <span
                          className={`mt-4 block w-full min-h-[40px] rounded-lg border px-3 py-2 text-center text-xs font-semibold transition max-md:mt-auto max-md:flex max-md:items-center max-md:justify-center max-md:px-2 max-md:py-1.5 max-md:text-[11px] sm:mt-5 sm:min-h-0 sm:px-4 sm:text-sm ${
                            isSelected
                              ? "border-primary-500 bg-primary-600 text-white max-md:border-primary-600"
                              : "border-primary-200 bg-primary-50/80 text-primary-800 max-md:border-primary-200 max-md:bg-white"
                          }`}
                        >
                          {isSelected ? "Selected" : `Select`}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                </div>

                {/* Mobile: payment + inclusions for the active tier only */}
                <div
                  className="mt-2 hidden max-md:mx-2 max-md:block rounded-lg border border-primary-200 bg-gradient-to-b from-primary-50/90 to-white px-2.5 py-2 text-[10px] leading-snug text-gray-800"
                  role="region"
                  aria-live="polite"
                  aria-label={`Payment details for ${selectedPackage.name}`}
                >
                  <p className="font-bold text-primary-800">
                    {selectedPackage.name} · KES {selectedPackage.amount.toLocaleString()} / ticket
                  </p>
                  <ul className="mt-1.5 space-y-0.5 text-[10px] text-gray-700">
                    {selectedPackage.perks.map((perk) => (
                      <li key={perk} className="flex gap-1.5">
                        <span className="text-primary-600">•</span>
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onPay("daraja");
              }}
              className="border-t border-gray-200 bg-white p-3 max-[360px]:p-2.5 sm:p-5 md:p-7 max-md:px-3 max-md:py-2 max-md:pt-2.5 text-sm max-md:text-sm"
            >
              <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 max-md:mb-2 max-md:gap-0">
                <h2 className="text-base font-extrabold text-gray-900 max-[360px]:text-sm sm:text-lg max-md:text-sm max-md:font-bold max-md:leading-tight">
                  Checkout
                </h2>
                <p className="text-xs font-semibold text-primary-700 max-[360px]:text-[11px] sm:text-sm max-md:text-xs max-md:font-medium max-md:leading-snug max-md:break-words">
                  Selected: {selectedPackage.name} - KES {selectedPackage.amount.toLocaleString()}
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 max-md:mb-2 max-md:px-2.5 max-md:py-1.5 max-md:text-xs max-md:leading-snug">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 max-md:mb-2 max-md:px-2.5 max-md:py-1.5 max-md:text-xs max-md:leading-snug">
                  {notice}
                </div>
              ) : null}
              {pendingReference && paymentStatus ? (
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-3 py-3 text-sm text-primary-900 max-md:mb-2 max-md:px-2.5 max-md:py-2 max-md:text-xs max-md:leading-snug">
                  <p className="break-all font-semibold">Payment reference: {pendingReference}</p>
                  <p className="mt-0.5 max-md:mt-0">
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
                    <p className="mt-0.5 max-md:mt-0">
                      Amount: {paymentStatus.currency ?? "KES"} {paymentStatus.amount.toLocaleString()}
                    </p>
                  ) : null}
                  <div className="mt-2 max-md:mt-1.5">
                    <a
                      href={`/receipt?ref=${encodeURIComponent(pendingReference)}`}
                      className="inline-flex min-h-[40px] items-center rounded-md border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 max-md:px-2.5 max-md:py-2 max-md:text-[11px]"
                    >
                      Open receipt
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 max-md:gap-2">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:text-sm max-md:px-2.5 max-md:py-2.5"
                  required
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:text-sm max-md:px-2.5 max-md:py-2.5"
                  required
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:text-sm max-md:px-2.5 max-md:py-2.5"
                  required
                />
                <input
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="Referrer's name (optional)"
                  maxLength={240}
                  className="min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:text-sm max-md:px-2.5 max-md:py-2.5"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number (e.g. 0712… or 254712…)"
                  autoComplete="tel"
                  inputMode="tel"
                  className="col-span-2 min-w-0 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:text-sm max-md:px-2.5 max-md:py-2.5"
                  required
                  aria-describedby="cfm-tickets-phone-hint"
                />
                <p
                  id="cfm-tickets-phone-hint"
                  className="col-span-2 text-xs text-gray-500 max-md:text-[11px] max-md:leading-snug"
                >
                  Required for all payments. M-Pesa checkout uses this number for the STK prompt.
                </p>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={normalizedQuantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Quantity"
                  inputMode="numeric"
                  className="col-span-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 sm:text-sm max-md:px-2.5 max-md:py-2.5"
                  required
                />
              </div>

              <label className="mt-4 flex items-start gap-2.5 text-xs text-gray-700 sm:text-sm max-md:mt-3 max-md:gap-2 max-md:text-[11px] max-md:leading-snug">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500 max-md:mt-0.5 sm:h-4 sm:w-4"
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

              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 max-md:mt-3 max-md:gap-2">
                <button
                  type="submit"
                  disabled={submittingMethod !== null}
                  aria-label="Pay with M-Pesa"
                  className="touch-manipulation inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 max-md:px-2 max-md:text-[11px] max-md:leading-tight sm:gap-2 sm:px-4 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingMethod === "daraja" ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin max-md:h-3.5 max-md:w-3.5" />
                      <span className="max-md:hidden">Processing M-Pesa...</span>
                      <span className="hidden max-md:inline text-center leading-tight">Wait…</span>
                    </>
                  ) : (
                    <>
                      <span className="max-md:hidden">Pay with M-Pesa</span>
                      <span className="hidden max-md:inline text-center leading-tight">M-Pesa</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void onPay("paystack")}
                  disabled={submittingMethod !== null}
                  aria-label="Pay with Card or Paystack"
                  className="touch-manipulation inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-1 rounded-lg bg-primary-700 px-2 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 max-md:px-2 max-md:text-[11px] max-md:leading-tight sm:gap-2 sm:px-4 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingMethod === "paystack" ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin max-md:h-3.5 max-md:w-3.5" />
                      <span className="max-md:hidden">Redirecting...</span>
                      <span className="hidden max-md:inline text-center leading-tight">Wait…</span>
                    </>
                  ) : (
                    <>
                      <span className="max-md:hidden">Pay with Card / Paystack</span>
                      <span className="hidden max-md:inline text-center leading-tight">Card / Paystack</span>
                    </>
                  )}
                </button>
              </div>

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
                    <p className="mt-2 text-xs font-semibold text-white sm:text-sm">
                      First payment
                    </p>
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
                      Use the phone or name you used when you started Lipa Pole Pole (optional if already filled in checkout).
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 sm:gap-3">
                      <input
                        type="tel"
                        value={balanceLookupPhone}
                        onChange={(e) => setBalanceLookupPhone(e.target.value)}
                        placeholder="Phone for lookup (optional)"
                        autoComplete="tel"
                        inputMode="tel"
                        className="w-full rounded-lg border border-white/40 bg-white px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-500 focus:border-white focus:ring-2 focus:ring-white/40 sm:text-sm max-md:px-2.5"
                      />
                      <input
                        type="text"
                        value={balanceLookupName}
                        onChange={(e) => setBalanceLookupName(e.target.value)}
                        placeholder="Name on record (optional)"
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
                        {installmentLookup.amount_paid_kes.toLocaleString()} · {installmentLookup.ticket_quantity}{" "}
                        ticket
                        {installmentLookup.ticket_quantity === 1 ? "" : "s"})
                      </p>
                    ) : null}
                    {/* Intentionally minimal copy here (per UX request). */}
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
            </form>
          </article>
          <CfmTicketsPosterCarousel />
          </div>
        </section>
      </main>
    </>
  );
}
