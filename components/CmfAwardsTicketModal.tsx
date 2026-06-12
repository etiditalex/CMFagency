"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Minus, Plus, X } from "lucide-react";
import { normalizePeoplePerPackage } from "@/lib/fusion-event-ticket-tier";
import {
  GENERIC_PAYMENT_FAILURE,
  messageForPaymentFailure,
  PaymentClientError,
} from "@/lib/payment-user-message";

const DEFAULT_EVENT = {
  title: "Coast Fashion and Modelling Awards 2026",
  shortTitle: "CFMA 2026",
  date: "15th August 2026",
  time: "6:50 PM",
  location: "Mombasa, Kenya",
  imageUrl: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg",
};

const DEFAULT_TIERS = [
  { id: "regular", label: "Early bird - Regular", slug: "cfma-2026", unitAmount: 500 },
  { id: "vip", label: "Early bird - VIP", slug: "cfma-2026-vip", unitAmount: 1500 },
  { id: "vvip", label: "Early bird - VVIP", slug: "cfma-2026-vvip", unitAmount: 3500 },
];

const STEPS = ["Select tickets", "Details", "Payment"] as const;

export type TicketTierInput = {
  id: string;
  label: string;
  slug: string;
  unit_amount_kes: number;
  /** Optional perks/inclusions for this tier (e.g. "Cocktail & Water", "Whiskey/Vodka/Gin + 2 Soda + 2 Water") */
  inclusions?: string[];
  /** Guests covered by one purchase (e.g. 4 for a round table). Omitted or 1 = single guest. */
  people_per_package?: number;
};

export type EventTicketModalEvent = {
  title: string;
  shortTitle?: string;
  date: string;
  time?: string;
  location?: string;
  imageUrl?: string | null;
};

type FormDetails = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  repeatEmail: string;
  phone: string;
  address: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** When provided, modal shows this event and tiers (Fusion Xpress tiered events). Otherwise CFMA 2026 defaults. */
  event?: EventTicketModalEvent | null;
  tiers?: TicketTierInput[] | null;
};

function normalizeTiers(
  tiers: TicketTierInput[] | null | undefined
): Array<{
  id: string;
  label: string;
  slug: string;
  unitAmount: number;
  inclusions?: string[];
  peoplePerPackage: number;
}> {
  if (!tiers?.length) {
    return DEFAULT_TIERS.map((t) => ({ ...t, peoplePerPackage: 1 }));
  }
  return tiers.map((t) => ({
    id: t.id,
    label: t.label,
    slug: t.slug,
    unitAmount: t.unit_amount_kes,
    inclusions: Array.isArray(t.inclusions) && t.inclusions.length > 0 ? t.inclusions : undefined,
    peoplePerPackage: normalizePeoplePerPackage(t.people_per_package),
  }));
}

export default function CmfAwardsTicketModal({ open, onClose, event: eventProp, tiers: tiersProp }: Props) {
  const EVENT = eventProp ?? DEFAULT_EVENT;
  const TICKET_TIERS = useMemo(() => normalizeTiers(tiersProp), [tiersProp]);
  const shortTitle = EVENT.shortTitle ?? EVENT.title;
  const imageUrl = EVENT.imageUrl ?? DEFAULT_EVENT.imageUrl;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(TICKET_TIERS.map((t) => [t.id, 0]))
  );
  const [details, setDetails] = useState<FormDetails>({
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    repeatEmail: "",
    phone: "",
    address: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "mpesa">("mpesa");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    amount_after_discount: number;
    discount_amount: number;
    coupon_id: string;
    quantity: number;
    slug: string;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const lineItems = useMemo(() => {
    return TICKET_TIERS.filter((t) => (quantities[t.id] ?? 0) > 0).map((t) => {
      const quantity = quantities[t.id] ?? 0;
      return {
        ...t,
        quantity,
        total: quantity * t.unitAmount,
        guestsCovered: quantity * t.peoplePerPackage,
      };
    });
  }, [quantities, TICKET_TIERS]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, i) => sum + i.total, 0),
    [lineItems]
  );
  const totalWithVat = appliedCoupon ? appliedCoupon.amount_after_discount : subtotal;

  const totalTickets = useMemo(
    () => lineItems.reduce((sum, i) => sum + i.quantity, 0),
    [lineItems]
  );

  const totalGuestsCovered = useMemo(
    () => lineItems.reduce((sum, i) => sum + i.guestsCovered, 0),
    [lineItems]
  );

  const canProceedFromStep1 = totalTickets > 0;
  const isSingleTier = lineItems.length === 1;
  // CFMA tickets are KES - always show M-Pesa option; backend errors if Daraja not configured
  const showMpesaOption = true;
  const phoneNorm = (() => {
    const p = details.phone.replace(/\s/g, "");
    if (p.startsWith("+254")) return "254" + p.slice(4);
    if (p.startsWith("254")) return p;
    if (p.startsWith("0") && p.length >= 10) return "254" + p.slice(1);
    if (p.length === 9 && /^[17]/.test(p)) return "254" + p;
    return p;
  })();
  const phoneValid = /^254[17]\d{8}$/.test(phoneNorm);
  const canProceedFromStep2 = useMemo(() => {
    if (!details.firstName.trim() || !details.lastName.trim()) return false;
    if (!details.email.trim()) return false;
    if (details.email !== details.repeatEmail) return false;
    const e = details.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    if (paymentMethod === "mpesa" && showMpesaOption) {
      return phoneValid;
    }
    return true;
  }, [details, paymentMethod, showMpesaOption, phoneValid]);
  const canPay =
    isSingleTier &&
    totalTickets > 0 &&
    (paymentMethod === "mpesa"
      ? showMpesaOption && phoneValid && details.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())
      : details.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()));

  const reset = useCallback(() => {
    setStep(1);
    setQuantities(Object.fromEntries(TICKET_TIERS.map((t) => [t.id, 0])));
    setDetails({
      company: "",
      firstName: "",
      lastName: "",
      email: "",
      repeatEmail: "",
      phone: "",
      address: "",
    });
    setPaymentMethod("mpesa");
    setError(null);
    setSubmitting(false);
    setPromoCode("");
    setShowPromoInput(false);
    setAppliedCoupon(null);
    setPromoError(null);
    setAgreedToTerms(false);
  }, [TICKET_TIERS]);

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
  };

  const applyPromo = async () => {
    const code = promoCode.trim();
    if (!code || lineItems.length === 0) return;
    const item = lineItems[0];
    setValidatingPromo(true);
    setPromoError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          code,
          quantity: item.quantity,
        }),
      });
      const json = (await res.json()) as {
        valid?: boolean;
        amount_after_discount?: number;
        discount_amount?: number;
        coupon_id?: string;
        error?: string;
      };
      if (json.valid && json.amount_after_discount != null && json.discount_amount != null && json.coupon_id) {
        setAppliedCoupon({
          amount_after_discount: json.amount_after_discount,
          discount_amount: json.discount_amount,
          coupon_id: json.coupon_id,
          quantity: item.quantity,
          slug: item.slug,
        });
        setPromoError(null);
      } else {
        setAppliedCoupon(null);
        setPromoError(json.error ?? "Invalid or expired code");
      }
    } catch {
      setAppliedCoupon(null);
      setPromoError("Could not validate code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedCoupon(null);
    setPromoError(null);
    setPromoCode("");
  };

  const goNext = () => {
    setError(null);
    if (step === 1 && !canProceedFromStep1) {
      setError("Please select at least one ticket.");
      return;
    }
    if (step === 2 && !canProceedFromStep2) {
      setError("Please fill in all required fields and ensure emails match.");
      return;
    }
    if (step < 4) setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPay || submitting || lineItems.length === 0) return;

    setSubmitting(true);
    setError(null);

    if (!agreedToTerms) {
      setError("Please agree to the Terms and Conditions before continuing.");
      setSubmitting(false);
      return;
    }

    try {
      if (!isSingleTier) {
        throw new PaymentClientError(
          "Please select one ticket type. For multiple types, visit each campaign page."
        );
      }
      const item = lineItems[0];

      if (paymentMethod === "mpesa" && showMpesaOption) {
        const res = await fetch("/api/daraja/stk-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: item.slug,
            phone: phoneNorm,
            email: details.email.trim(),
            payer_name: [details.firstName.trim(), details.lastName.trim()].filter(Boolean).join(" ") || null,
            quantity: item.quantity,
            coupon_code: appliedCoupon ? promoCode.trim() : undefined,
          }),
        });
        const raw = await res.text();
        let json: { reference?: string; error?: string } = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {}
        }
        if (!res.ok) throw new Error();
        if (json.reference) {
          onClose();
          window.location.href = `/receipt?ref=${encodeURIComponent(json.reference)}`;
        }
        return;
      }

      const useInline = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: item.slug,
            email: details.email.trim(),
            payer_name: [details.firstName.trim(), details.lastName.trim()].filter(Boolean).join(" ") || null,
            quantity: item.quantity,
            inline: useInline,
            coupon_code: appliedCoupon ? promoCode.trim() : undefined,
          }),
        });

        const raw = await res.text();
        let json: {
          authorization_url?: string;
          reference?: string;
          amount_subunit?: number;
          email?: string;
          currency?: string;
          error?: string;
        } = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {}
        }

        if (!res.ok) {
          throw new Error();
        }

        if (useInline && json.reference && json.amount_subunit != null && json.email && json.currency) {
          const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;
          const { default: PaystackPop } = await import("@paystack/inline-js");
          const paystack = new PaystackPop();
          paystack.newTransaction({
            key: paystackKey,
            email: json.email,
            amount: json.amount_subunit,
            currency: json.currency,
            reference: json.reference,
            channels: ["card", "mobile_money"],
            onSuccess: () => {
              onClose();
              window.location.href = `/receipt?ref=${encodeURIComponent(json.reference!)}`;
            },
            onCancel: () => setSubmitting(false),
            onError: () => {
              setError(GENERIC_PAYMENT_FAILURE);
              setSubmitting(false);
            },
          });
          return;
        }

        if (json.authorization_url) {
          onClose();
          window.location.href = json.authorization_url;
          return;
        }

        throw new Error();
    } catch (e: unknown) {
      setError(messageForPaymentFailure(e));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  useEffect(() => {
    if (lineItems.length === 0) {
      setAppliedCoupon(null);
    } else if (appliedCoupon && (lineItems[0].quantity !== appliedCoupon.quantity || lineItems[0].slug !== appliedCoupon.slug)) {
      setAppliedCoupon(null);
      setPromoError(null);
    }
  }, [lineItems, appliedCoupon]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label={eventProp ? `${EVENT.title} ticket purchase` : "CFMA 2026 ticket purchase"}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl border border-gray-200"
        >
          <button
            onClick={onClose}
            className="absolute right-2 top-2 sm:right-3 sm:top-3 z-20 inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200"
            aria-label="Close"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-800" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Left: main content */}
            <div className="md:col-span-3 p-4 pt-12 sm:p-6 md:p-8">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                <span>{shortTitle}</span>
                <span>·</span>
                <span>{EVENT.date}</span>
                <span>{EVENT.time ?? ""}</span>
              </div>

              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                {STEPS.map((s, i) => {
                  const stepNum = i + 1;
                  const active = step === stepNum || (step === 4 && stepNum === 3);
                  return (
                    <span key={s}>
                      <span className={active ? "font-semibold text-gray-900" : ""}>{s}</span>
                      {i < STEPS.length - 1 && <span className="mx-1">›</span>}
                    </span>
                  );
                })}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <h2 className="text-base sm:text-xl font-bold text-gray-900">ADVANCE TICKETS</h2>
                    <div className="space-y-3">
                      {TICKET_TIERS.map((tier) => {
                        const qty = quantities[tier.id] ?? 0;
                        return (
                          <div
                            key={tier.id}
                            className={`flex items-center justify-between gap-4 py-2 border-b border-gray-100 rounded-lg transition-colors ${
                              qty > 0 ? 'hover:bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm sm:text-base text-gray-900">{tier.label}</div>
                              <div className="text-primary-600 font-bold text-sm sm:text-base">
                                KES {tier.unitAmount.toLocaleString()}.00
                              </div>
                              {tier.peoplePerPackage > 1 ? (
                                <div className="mt-0.5 text-xs font-medium text-gray-700">
                                  Covers {tier.peoplePerPackage} people per package
                                </div>
                              ) : null}
                              {tier.inclusions?.length ? (
                                <div className="mt-1 text-xs text-gray-600">
                                  Includes: {tier.inclusions.join(" · ")}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantities((p) => ({
                                    ...p,
                                    [tier.id]: Math.max(0, (p[tier.id] ?? 0) - 1),
                                  }))
                                }
                                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                aria-label={`Decrease ${tier.label}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-10 text-center font-semibold">{qty}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantities((p) => ({
                                    ...p,
                                    [tier.id]: (p[tier.id] ?? 0) + 1,
                                  }))
                                }
                                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                aria-label={`Increase ${tier.label}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canProceedFromStep1}
                      className="w-full py-3 rounded-lg bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                    >
                      Continue
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your details</h2>
                    <div className="space-y-4">
                      {showMpesaOption && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
                          <div className="flex gap-3">
                            <label
                              className={`flex-1 cursor-pointer rounded-lg border p-3 flex items-center justify-center gap-2 ${
                                paymentMethod === "mpesa" ? "border-green-600 bg-green-50" : "border-gray-200 bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="mpesa"
                                checked={paymentMethod === "mpesa"}
                                onChange={() => setPaymentMethod("mpesa")}
                                className="sr-only"
                              />
                              <Image
                                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479160/M-PESA-logo-2_phv5ni.png"
                                alt="M-Pesa"
                                width={80}
                                height={28}
                                className="h-7 w-auto object-contain"
                              />
                            </label>
                            <label
                              className={`flex-1 cursor-pointer rounded-lg border p-3 flex items-center justify-center gap-2 ${
                                paymentMethod === "paystack" ? "border-primary-600 bg-primary-50" : "border-gray-200 bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="paystack"
                                checked={paymentMethod === "paystack"}
                                onChange={() => setPaymentMethod("paystack")}
                                className="sr-only"
                              />
                              <Image
                                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/visa_x5rgq6.svg"
                                alt="Visa"
                                width={48}
                                height={16}
                                className="h-4 w-auto object-contain"
                              />
                              <Image
                                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/mastercard_gvjys4.svg"
                                alt="Mastercard"
                                width={36}
                                height={28}
                                className="h-5 w-auto object-contain"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                      {paymentMethod === "mpesa" && showMpesaOption && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa phone number</label>
                          <input
                            type="tel"
                            placeholder="254712345678"
                            value={details.phone}
                            onChange={(e) => setDetails((d) => ({ ...d, phone: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            required
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          placeholder="Company (optional)"
                          value={details.company}
                          onChange={(e) => setDetails((d) => ({ ...d, company: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-2"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="First name"
                            value={details.firstName}
                            onChange={(e) => setDetails((d) => ({ ...d, firstName: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Last name"
                            value={details.lastName}
                            onChange={(e) => setDetails((d) => ({ ...d, lastName: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Your email address {paymentMethod === "mpesa" ? "(optional, for receipt)" : ""}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            placeholder="Email address"
                            value={details.email}
                            onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            required={paymentMethod !== "mpesa"}
                          />
                          <input
                            type="email"
                            placeholder="Repeat email address"
                            value={details.repeatEmail}
                            onChange={(e) => setDetails((d) => ({ ...d, repeatEmail: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            required={paymentMethod !== "mpesa"}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your address</label>
                        <input
                          type="text"
                          placeholder="Address"
                          value={details.address}
                          onChange={(e) => setDetails((d) => ({ ...d, address: e.target.value }))}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!canProceedFromStep2}
                        className="flex-1 py-3 rounded-lg bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Payment</h2>
                    <div className="rounded-xl border border-gray-200 p-4 bg-blue-50/50">
                      <p className="text-gray-700">
                        {paymentMethod === "mpesa"
                          ? "You'll receive an M-Pesa prompt on your phone. Enter your PIN to complete payment."
                          : "Pay with Visa, Mastercard, M-Pesa, or Airtel Money. Uses your email from the previous step."}
                      </p>
                      {!isSingleTier && (
                        <p className="text-amber-700 mt-2 text-sm font-medium">
                          Please select one ticket type only. For multiple types, visit each campaign page.
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={goBack}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!isSingleTier}
                        className="flex-1 py-3 rounded-lg bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="rounded-xl border border-gray-200 p-4 bg-white">
                        <div className="font-semibold text-gray-900">
                          {lineItems[0]?.label ?? "Ticket"}
                          {lineItems.length > 1 && ` + ${lineItems.length - 1} more`}
                        </div>
                        <div className="text-primary-600 font-bold mt-1">
                          Kes. {totalWithVat.toLocaleString()}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-600">
                          <span>
                            Packages: <span className="font-semibold text-gray-900">{totalTickets}</span>
                          </span>
                          {totalGuestsCovered > totalTickets ? (
                            <span>
                              Guests covered:{" "}
                              <span className="font-semibold text-gray-900">{totalGuestsCovered}</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Total: KES {totalWithVat.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount</label>
                        <div className="text-2xl font-bold text-gray-900">
                          Kes. {totalWithVat.toLocaleString()}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        {paymentMethod === "mpesa" && showMpesaOption ? (
                          <>
                            <div className="font-medium text-gray-900">Pay with M-Pesa</div>
                            <p className="text-sm text-gray-600 mt-1">
                              We&apos;ll send a prompt to <span className="font-medium">{details.phone || "your phone"}</span>.
                              Enter your M-Pesa PIN to complete payment.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-gray-900">Pay with Card</div>
                            <p className="text-sm text-gray-600 mt-1">
                              We&apos;ll use <span className="font-medium">{details.email}</span>
                              {process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                                ? " and open a secure popup to choose your payment method."
                                : " and redirect you to Paystack to complete payment."}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <form onSubmit={handlePay} className="space-y-4">
                      <div className="flex items-start gap-2">
                        <input
                          id="cfma-terms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <label htmlFor="cfma-terms" className="text-xs sm:text-sm text-gray-700">
                          I agree to the{" "}
                          <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 underline"
                          >
                            Terms and Conditions
                          </a>
                          .
                        </label>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={goBack}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={!canPay || submitting}
                          className="flex-1 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold inline-flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              {paymentMethod === "mpesa"
                                ? "Check your phone for M-Pesa prompt..."
                                : process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                                  ? "Complete payment in popup..."
                                  : "Redirecting..."}
                            </>
                          ) : paymentMethod === "mpesa" && showMpesaOption ? (
                            <>
                              <Image
                                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479160/M-PESA-logo-2_phv5ni.png"
                                alt="M-Pesa"
                                width={64}
                                height={22}
                                className="h-[22px] w-auto object-contain brightness-0 invert"
                              />
                            </>
                          ) : (
                            <>
                              <Image
                                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/visa_x5rgq6.svg"
                                alt="Visa"
                                width={36}
                                height={12}
                                className="h-4 w-auto object-contain brightness-0 invert opacity-90"
                              />
                              <Image
                                src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1773479587/mastercard_gvjys4.svg"
                                alt="Mastercard"
                                width={28}
                                height={22}
                                className="h-5 w-auto object-contain brightness-0 invert opacity-90"
                              />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: order summary / shopping cart */}
            <div className="md:col-span-2 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">
                {step === 1 ? "Shopping cart" : "Purchase overview"}
              </h3>
              {totalTickets === 0 ? (
                <p className="text-gray-600 text-sm">
                  The shopping cart is empty. Please select tickets.
                </p>
              ) : (
                <div className="space-y-3">
                  {lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm gap-2"
                    >
                      <span className="text-gray-700 min-w-0">
                        {item.label} × {item.quantity}
                        {item.peoplePerPackage > 1 ? (
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {item.peoplePerPackage} people / package · {item.guestsCovered} guests total
                          </span>
                        ) : null}
                      </span>
                      <span className="font-semibold shrink-0">
                        KES {item.total.toLocaleString()}.00
                      </span>
                    </div>
                  ))}
                  {appliedCoupon && appliedCoupon.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Discount (promo)</span>
                      <span className="font-semibold">- KES {appliedCoupon.discount_amount.toLocaleString()}.00</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">
                      KES {totalWithVat.toLocaleString()}.00
                    </span>
                  </div>
                </div>
              )}
              <div className="mt-6">
                {!showPromoInput && !appliedCoupon && (
                  <button
                    type="button"
                    onClick={() => setShowPromoInput(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Add promo code
                  </button>
                )}
                {showPromoInput && !appliedCoupon && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={validatingPromo || !promoCode.trim()}
                        className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {promoError && <p className="text-xs text-red-600">{promoError}</p>}
                  </div>
                )}
                {appliedCoupon && (
                  <p className="text-sm text-green-700 font-medium">
                    Promo applied. Total: KES {totalWithVat.toLocaleString()}.00
                    <button type="button" onClick={removePromo} className="ml-2 text-primary-600 hover:underline">
                      Remove
                    </button>
                  </p>
                )}
              </div>
              <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-200">
                <div className="relative h-16 sm:aspect-video sm:h-auto rounded-lg overflow-hidden bg-gray-200">
                  <Image
                    src={imageUrl}
                    alt={shortTitle}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-3 font-semibold text-gray-900">{shortTitle}</div>
                <div className="text-sm text-gray-600">
                  {EVENT.date} {EVENT.time}
                </div>
              </div>
              <div className="mt-6 space-y-1 text-xs text-gray-500">
                <Link href="/contact" className="block hover:text-gray-700">
                  Imprint of the organizer
                </Link>
                <Link href="/privacy" className="block hover:text-gray-700">
                  Data privacy policy
                </Link>
                <Link href="/terms" className="block hover:text-gray-700">
                  Terms and conditions of the organizer
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
