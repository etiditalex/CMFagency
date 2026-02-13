"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Minus, Plus, X } from "lucide-react";
import PaystackPop from "@paystack/inline-js";

const EVENT = {
  title: "Coast Fashion and Modelling Awards 2026",
  shortTitle: "CFMA 2026",
  date: "15th August 2026",
  time: "6:50 PM",
  location: "Mombasa, Kenya",
  imageUrl: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg",
};

const TICKET_TIERS = [
  { id: "regular", label: "Early bird - Regular", slug: "cfma-2026", unitAmount: 500 },
  { id: "vip", label: "Early bird - VIP", slug: "cfma-2026-vip", unitAmount: 1500 },
  { id: "vvip", label: "Early bird - VVIP", slug: "cfma-2026-vvip", unitAmount: 3500 },
] as const;

const STEPS = ["Select tickets", "Details", "Payment"] as const;

type FormDetails = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  repeatEmail: string;
  address: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CmfAwardsTicketModal({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({ regular: 0, vip: 0, vvip: 0 });
  const [details, setDetails] = useState<FormDetails>({
    company: "",
    firstName: "",
    lastName: "",
    email: "",
    repeatEmail: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lineItems = useMemo(() => {
    return TICKET_TIERS.filter((t) => (quantities[t.id] ?? 0) > 0).map((t) => ({
      ...t,
      quantity: quantities[t.id] ?? 0,
      total: (quantities[t.id] ?? 0) * t.unitAmount,
    }));
  }, [quantities]);

  const totalWithVat = useMemo(
    () => lineItems.reduce((sum, i) => sum + i.total, 0),
    [lineItems]
  );

  const totalTickets = useMemo(
    () => lineItems.reduce((sum, i) => sum + i.quantity, 0),
    [lineItems]
  );

  const canProceedFromStep1 = totalTickets > 0;
  const canProceedFromStep2 = useMemo(() => {
    if (!details.firstName.trim() || !details.lastName.trim()) return false;
    if (!details.email.trim()) return false;
    if (details.email !== details.repeatEmail) return false;
    const e = details.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    return true;
  }, [details]);
  const isSingleTier = lineItems.length === 1;
  const canPay =
    isSingleTier &&
    totalTickets > 0 &&
    details.email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim());

  const reset = useCallback(() => {
    setStep(1);
    setQuantities({ regular: 0, vip: 0, vvip: 0 });
    setDetails({
      company: "",
      firstName: "",
      lastName: "",
      email: "",
      repeatEmail: "",
      address: "",
    });
    setError(null);
    setSubmitting(false);
  }, []);

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4);
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

    try {
      if (!isSingleTier) {
        throw new Error("Please select one ticket type. For multiple types, visit each campaign page.");
      }
      const item = lineItems[0];
      const useInline = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: item.slug,
            email: details.email.trim(),
            quantity: item.quantity,
            inline: useInline,
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
          const msg = (typeof json.error === "string" ? json.error : raw) || "Card payment initialization failed.";
          throw new Error(msg);
        }

        if (useInline && json.reference && json.amount_subunit != null && json.email && json.currency) {
          const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;
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
              window.location.href = `/pay/${item.slug}?ref=${encodeURIComponent(json.reference!)}`;
            },
            onCancel: () => setSubmitting(false),
            onError: (err: { message?: string }) => {
              setError(err?.message ?? "Payment was not completed.");
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

        throw new Error("Missing payment link.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="CFMA 2026 ticket purchase"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 hover:bg-white shadow-md border border-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-800" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* Left: main content */}
            <div className="md:col-span-3 p-6 md:p-8">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span>{EVENT.shortTitle}</span>
                <span>·</span>
                <span>{EVENT.date}</span>
                <span>{EVENT.time}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
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
                    <h2 className="text-xl font-bold text-gray-900">ADVANCE TICKETS</h2>
                    <div className="space-y-4">
                      {TICKET_TIERS.map((tier) => {
                        const qty = quantities[tier.id] ?? 0;
                        return (
                          <div
                            key={tier.id}
                            className="flex items-center justify-between gap-4 py-3 border-b border-gray-100"
                          >
                            <div>
                              <div className="font-semibold text-gray-900">{tier.label}</div>
                              <div className="text-primary-600 font-bold">
                                KES {tier.unitAmount.toLocaleString()}.00
                              </div>
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
                    <h2 className="text-xl font-bold text-gray-900">Your details</h2>
                    <div className="space-y-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your email address</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="email"
                            placeholder="Email address"
                            value={details.email}
                            onChange={(e) => setDetails((d) => ({ ...d, email: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            required
                          />
                          <input
                            type="email"
                            placeholder="Repeat email address"
                            value={details.repeatEmail}
                            onChange={(e) => setDetails((d) => ({ ...d, repeatEmail: e.target.value }))}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            required
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
                    <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                    <div className="rounded-xl border border-gray-200 p-4 bg-blue-50/50">
                      <p className="text-gray-700">
                        Pay with <strong>Visa</strong>, <strong>Mastercard</strong>, <strong>M-Pesa</strong>, or <strong>Airtel Money</strong>. Uses your email from the previous step.
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
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-sm text-gray-600">Quantity</span>
                          <span className="font-semibold">{totalTickets}</span>
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
                        <div className="font-medium text-gray-900">Pay with Card, M-Pesa or Airtel Money</div>
                        <p className="text-sm text-gray-600 mt-1">
                          We&apos;ll use <span className="font-medium">{details.email}</span>
                          {process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                            ? " and open a secure popup to choose your payment method."
                            : " and redirect you to Paystack to complete payment."}
                        </p>
                      </div>
                    </div>
                    <form onSubmit={handlePay} className="space-y-3">
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
                              {process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                                ? "Complete payment in popup..."
                                : "Redirecting..."}
                            </>
                          ) : (
                            "Pay with Card, M-Pesa or Airtel Money"
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: order summary / shopping cart */}
            <div className="md:col-span-2 bg-gray-50 border-t md:border-t-0 md:border-l border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
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
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-700">
                        {item.label} × {item.quantity}
                      </span>
                      <span className="font-semibold">
                        KES {item.total.toLocaleString()}.00
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">
                      KES {totalWithVat.toLocaleString()}.00
                    </span>
                  </div>
                </div>
              )}
              <div className="mt-6">
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Add promo code
                </button>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-200">
                  <Image
                    src={EVENT.imageUrl}
                    alt={EVENT.shortTitle}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-3 font-semibold text-gray-900">{EVENT.shortTitle}</div>
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
