"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CreditCard, Loader2, Minus, Plus, X } from "lucide-react";

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
const VAT_RATE = 0.16; // 16% VAT

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
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lineItems = useMemo(() => {
    return TICKET_TIERS.filter((t) => (quantities[t.id] ?? 0) > 0).map((t) => ({
      ...t,
      quantity: quantities[t.id] ?? 0,
      total: (quantities[t.id] ?? 0) * t.unitAmount,
    }));
  }, [quantities]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, i) => sum + i.total, 0),
    [lineItems]
  );

  const vatAmount = useMemo(() => Math.round(subtotal * VAT_RATE), [subtotal]);
  const totalWithVat = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount]);

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
  const canPayMpesa = phone.trim().length >= 9 && totalTickets > 0;
  const canPayCard = details.email.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()) && totalTickets > 0;
  const canPay = paymentMethod === "mpesa" ? canPayMpesa : canPayCard;
  const isSingleTier = lineItems.length === 1;
  const cardAvailable = isSingleTier;

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
    setPaymentMethod("mpesa");
    setPhone("");
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
      if (paymentMethod === "card") {
        if (!cardAvailable || lineItems.length !== 1) {
          throw new Error("Card payment is available for single ticket type only.");
        }
        const item = lineItems[0];
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: item.slug,
            email: details.email.trim(),
            quantity: item.quantity,
          }),
        });

        const raw = await res.text();
        let json: { authorization_url?: string; reference?: string; error?: string } = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {}
        }

        if (!res.ok) {
          const msg = (typeof json.error === "string" ? json.error : raw) || "Card payment initialization failed.";
          throw new Error(msg);
        }
        if (!json.authorization_url) throw new Error("Missing payment link.");

        onClose();
        window.location.href = json.authorization_url;
        return;
      }

      const refs: string[] = [];
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const res = await fetch("/api/mpesa/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: item.slug,
            phone: phone.trim(),
            quantity: item.quantity,
            email: details.email.trim() || undefined,
          }),
        });

        const raw = await res.text();
        let json: { reference?: string; error?: string } = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {}
        }

        if (!res.ok) {
          const msg = (typeof json.error === "string" ? json.error : raw) || "Payment initialization failed.";
          throw new Error(msg);
        }
        if (!json.reference) throw new Error("Missing transaction reference.");

        refs.push(json.reference);
      }

      onClose();
      window.location.href = `/pay/${lineItems[0].slug}?ref=${encodeURIComponent(refs[0])}`;
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
                    <h2 className="text-xl font-bold text-gray-900">How would you like to pay?</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("mpesa")}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                          paymentMethod === "mpesa"
                            ? "border-primary-600 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#00A651]/10 flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-[#00A651]">M</span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">M-Pesa</div>
                          <p className="text-sm text-gray-600 mt-1">Safaricom mobile money. Enter phone on next step.</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => cardAvailable && setPaymentMethod("card")}
                        disabled={!cardAvailable}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                          paymentMethod === "card"
                            ? "border-primary-600 bg-primary-50"
                            : cardAvailable
                              ? "border-gray-200 hover:border-gray-300"
                              : "border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Card (Visa/Mastercard)</div>
                          <p className="text-sm text-gray-600 mt-1">
                            {cardAvailable
                              ? "Pay securely with your card. Uses email from above."
                              : "Single ticket type only. Use M-Pesa for mixed orders."}
                          </p>
                        </div>
                      </button>
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
                        className="flex-1 py-3 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold"
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
                          Subtotal KES {subtotal.toLocaleString()} + VAT (16%) KES {vatAmount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (incl. VAT)</label>
                        <div className="text-2xl font-bold text-gray-900">
                          Kes. {totalWithVat.toLocaleString()}
                        </div>
                      </div>
                      {paymentMethod === "mpesa" ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          <input
                            type="tel"
                            inputMode="tel"
                            placeholder="Enter Phone Number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Format: 07XXXXXXXX (Safaricom M-Pesa)</p>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <div className="font-medium text-gray-900">Card payment</div>
                          <p className="text-sm text-gray-600 mt-1">
                            We&apos;ll use <span className="font-medium">{details.email}</span> and redirect you to Paystack to complete payment with Visa or Mastercard.
                          </p>
                        </div>
                      )}
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
                              {paymentMethod === "mpesa" ? "Processing M-Pesa..." : "Redirecting..."}
                            </>
                          ) : paymentMethod === "mpesa" ? (
                            "Pay with M-Pesa"
                          ) : (
                            "Pay with Card (Visa/Mastercard)"
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
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span>KES {subtotal.toLocaleString()}.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>VAT (16%)</span>
                      <span>KES {vatAmount.toLocaleString()}.00</span>
                    </div>
                  </div>
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
