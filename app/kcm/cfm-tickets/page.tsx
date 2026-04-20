"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Ticket } from "lucide-react";
import {
  PaymentClientError,
  messageForPaymentFailure,
} from "@/lib/payment-user-message";

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

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are the CFM Tickets package prices?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "CFM Tickets packages are KES 500, KES 1,500, and KES 3,500.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in the KES 500 ticket package?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The KES 500 Standard Access package includes entry for one guest, general seating, and an event wristband.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in the KES 1,500 ticket package?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The KES 1,500 Premium Access package includes priority entry, a reserved seating zone, and a complimentary refreshment.",
      },
    },
    {
      "@type": "Question",
      name: "What is included in the KES 3,500 ticket package?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The KES 3,500 VIP Access package includes a front-row experience, VIP lounge access, and a meet and greet opportunity.",
      },
    },
  ],
};

export default function CfmTicketsPage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
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

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.amount === selectedAmount) ?? packages[0],
    [selectedAmount]
  );

  const payerName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;
  const normalizedQuantity = Math.max(1, Math.min(10000, Math.trunc(Number(quantity) || 1)));

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
        quantity: normalizedQuantity,
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
    const p = phone.trim();
    if (!p) {
      throw new PaymentClientError("M-Pesa phone number is required.");
    }

    const res = await fetch("/api/daraja/stk-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selectedPackage.slug,
        phone: p,
        email: email.trim(),
        payer_name: payerName,
        quantity: normalizedQuantity,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main
        className="relative min-h-screen overflow-hidden bg-cover bg-center bg-no-repeat pt-20 pb-8 max-[360px]:pt-[74px] sm:pt-24 sm:pb-10 md:pt-28 md:pb-16"
        style={{
          backgroundImage:
            "url('https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-black/25" />

        <section className="container-custom relative z-10 mt-3 sm:mt-4 md:mt-6">
          <article className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/35 bg-white shadow-2xl sm:rounded-3xl">
            <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 px-4 py-4 text-white max-[360px]:px-3 max-[360px]:py-3.5 sm:px-6 sm:py-5 md:px-8 md:py-6">
              <h1 className="text-lg font-extrabold leading-tight max-[360px]:text-base sm:text-2xl md:text-3xl">
                Choose Your Ticket Package
              </h1>
            </div>

            <div className="grid gap-3 bg-white p-3 max-[360px]:gap-2.5 max-[360px]:p-2.5 sm:gap-4 sm:p-5 md:grid-cols-3 md:p-7">
              {packages.map((pkg) => (
                <section
                  key={pkg.amount}
                  className={`rounded-xl border bg-white p-3 max-[360px]:p-2.5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl sm:p-5 ${
                    selectedPackage.amount === pkg.amount
                      ? "border-primary-400 ring-2 ring-primary-100"
                      : "border-gray-200"
                  }`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700 max-[360px]:text-[10px] sm:text-xs">{pkg.name}</p>
                  <p className="mt-2 text-xl font-extrabold text-gray-900 max-[360px]:text-lg sm:text-3xl">
                    KES {pkg.amount.toLocaleString()}
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-700 max-[360px]:mt-2.5 max-[360px]:space-y-1 max-[360px]:text-[11px] sm:mt-4 sm:space-y-2 sm:text-sm">
                    {pkg.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-600" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setSelectedAmount(pkg.amount)}
                    className="mt-4 w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100 max-[360px]:mt-3 max-[360px]:px-2.5 max-[360px]:text-[11px] sm:mt-5 sm:px-4 sm:text-sm"
                  >
                    {selectedPackage.amount === pkg.amount ? "Selected" : `Select ${pkg.amount}`}
                  </button>
                </section>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void onPay("daraja");
              }}
              className="border-t border-gray-200 bg-white p-3 max-[360px]:p-2.5 sm:p-5 md:p-7"
            >
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                <h2 className="text-base font-extrabold text-gray-900 max-[360px]:text-sm sm:text-lg">Checkout</h2>
                <p className="text-xs font-semibold text-primary-700 max-[360px]:text-[11px] sm:text-sm">
                  Selected: {selectedPackage.name} - KES {selectedPackage.amount.toLocaleString()}
                </p>
              </div>

              {error ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {notice}
                </div>
              ) : null}
              {pendingReference && paymentStatus ? (
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-3 py-3 text-sm text-primary-900">
                  <p className="break-all font-semibold">Payment reference: {pendingReference}</p>
                  <p className="mt-1">
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
                    <p className="mt-1">
                      Amount: {paymentStatus.currency ?? "KES"} {paymentStatus.amount.toLocaleString()}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <a
                      href={`/receipt?ref=${encodeURIComponent(pendingReference)}`}
                      className="inline-flex rounded-md border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      Open receipt
                    </a>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 max-[360px]:px-2.5 max-[360px]:text-[13px]"
                  required
                />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 max-[360px]:px-2.5 max-[360px]:text-[13px]"
                  required
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 max-[360px]:px-2.5 max-[360px]:text-[13px]"
                  required
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="M-Pesa phone (e.g. 254712345678)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 max-[360px]:px-2.5 max-[360px]:text-[13px]"
                />
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={normalizedQuantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  placeholder="Quantity"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 max-[360px]:px-2.5 max-[360px]:text-[13px] sm:col-span-2"
                  required
                />
              </div>

              <label className="mt-4 flex items-start gap-2 text-xs text-gray-700 sm:text-sm">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={submittingMethod !== null}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 max-[360px]:px-3 max-[360px]:text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingMethod === "daraja" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing M-Pesa...
                    </>
                  ) : (
                    "Pay with M-Pesa"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void onPay("paystack")}
                  disabled={submittingMethod !== null}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-800 max-[360px]:px-3 max-[360px]:text-[13px] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingMethod === "paystack" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    "Pay with Card / Paystack"
                  )}
                </button>
              </div>
            </form>
          </article>
        </section>
      </main>
    </>
  );
}
