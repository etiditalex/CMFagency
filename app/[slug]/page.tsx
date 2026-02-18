"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Ticket, Vote } from "lucide-react";
import PaystackPop from "@paystack/inline-js";

import { supabase } from "@/lib/supabase";

type Campaign = {
  id: string;
  type: "ticket" | "vote";
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  currency: string;
  unit_amount: number;
  max_per_txn: number;
};

type Contestant = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export default function CampaignPage() {
  const router = useRouter();
  const routeParams = useParams<{ slug?: string | string[] }>();
  const slug = useMemo(() => {
    const s = routeParams?.slug;
    if (Array.isArray(s)) return s[0] ?? "";
    return String(s ?? "");
  }, [routeParams?.slug]);
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") ?? null;

  const [txStatus, setTxStatus] = useState<
    null | {
      status: "pending" | "success" | "failed" | "abandoned" | string;
      verified_at: string | null;
      fulfilled_at: string | null;
      paid_at: string | null;
      currency: string | null;
      amount: number | null;
      quantity: number | null;
      campaign_type: "ticket" | "vote" | string | null;
      mpesa_receipt?: string | null;
      campaign_title?: string | null;
      campaign_slug?: string | null;
      starts_at?: string | null;
      ends_at?: string | null;
      email?: string | null;
      payer_name?: string | null;
    }
  >(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const receiptRequestedRef = useRef(false);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contestants, setContestants] = useState<Contestant[]>([]);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [contestantId, setContestantId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "mpesa">("mpesa");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!slug) throw new Error("Missing campaign slug in URL.");
        const { data: c, error: cErr } = await supabase
          .from("campaigns")
          .select("id,type,slug,title,description,image_url,currency,unit_amount,max_per_txn")
          .eq("slug", slug)
          .maybeSingle();

        if (cErr) throw cErr;
        if (!c) {
          const msg = [
            `Campaign "${slug}" is not available publicly.`,
            "",
            "Checklist:",
            "- Confirm the row exists in public.campaigns for this slug.",
            "- Ensure is_active = true.",
            "- Ensure starts_at/ends_at are NULL or within the current time window.",
            '- Ensure the public RLS policy "campaigns_public_read_active" exists and grants SELECT to anon.',
            "",
            "If you recently created the campaign, open it from the dashboard first to confirm it saved correctly.",
          ].join("\n");
          throw new Error(msg);
        }

        if (!cancelled) setCampaign(c as Campaign);

        if (c?.type === "vote") {
          const { data: rows, error: rErr } = await supabase
            .from("contestants")
            .select("id,name,description,image_url,sort_order")
            .eq("campaign_id", c.id)
            .order("sort_order", { ascending: true });

          if (rErr) throw rErr;
          if (!cancelled) {
            setContestants((rows ?? []) as Contestant[]);
            setContestantId((rows?.[0]?.id as string) ?? "");
          }
        }
      } catch (e: any) {
        if (cancelled) return;
        const msg = String(e?.message ?? "");
        const parts = [msg, e?.details, e?.hint, e?.code ? `code=${e.code}` : null].filter(Boolean);
        setError(parts.length > 0 ? parts.join("\n") : "Unable to load campaign");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!ref) return;
    receiptRequestedRef.current = false;

    let cancelled = false;
    let interval: number | undefined;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/transactions/status?ref=${encodeURIComponent(ref)}`);
        const raw = await res.text();
        let json: any = {};
        if (raw) {
          try {
            json = JSON.parse(raw);
          } catch {
            json = {};
          }
        }
        if (!res.ok) throw new Error(json?.error ?? raw ?? "Unable to fetch payment status");

        const next = {
          status: String(json.status ?? "pending"),
          verified_at: (json.verified_at as string | null) ?? null,
          fulfilled_at: (json.fulfilled_at as string | null) ?? null,
          paid_at: (json.paid_at as string | null) ?? null,
          currency: (json.currency as string | null) ?? null,
          amount: (typeof json.amount === "number" ? (json.amount as number) : null) as number | null,
          quantity: (typeof json.quantity === "number" ? (json.quantity as number) : null) as number | null,
          campaign_type: (json.campaign_type as any) ?? null,
          mpesa_receipt: (json.mpesa_receipt as string | null) ?? null,
          campaign_title: (json.campaign_title as string | null) ?? null,
          campaign_slug: (json.campaign_slug as string | null) ?? null,
          starts_at: (json.starts_at as string | null) ?? null,
          ends_at: (json.ends_at as string | null) ?? null,
          email: (json.email as string | null) ?? null,
          payer_name: (json.payer_name as string | null) ?? null,
        };

        if (!cancelled) setTxStatus(next);

        if (next.status === "success") {
          if (!receiptRequestedRef.current) {
            receiptRequestedRef.current = true;
            fetch(`/api/send-receipt?ref=${encodeURIComponent(ref)}`, { method: "POST" }).catch(() => {});
          }
        }

        if (next.status === "success" || next.status === "failed" || next.status === "abandoned") {
          if (interval) window.clearInterval(interval);
        }
      } catch {
        // Non-fatal: keep polling briefly
      }
    };

    fetchStatus();
    interval = window.setInterval(fetchStatus, 2000);

    const stopTimeout = window.setTimeout(() => {
      if (interval) window.clearInterval(interval);
    }, 60_000);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
      window.clearTimeout(stopTimeout);
    };
  }, [ref]);

  const qty = useMemo(() => {
    if (!campaign) return 1;
    return Math.max(1, Math.min(campaign.max_per_txn, Math.trunc(quantity)));
  }, [campaign, quantity]);
  const total = useMemo(() => {
    if (!campaign) return 0;
    return qty * campaign.unit_amount;
  }, [campaign, qty]);

  const isKes = String(campaign?.currency ?? "").toUpperCase() === "KES";
  // Show M-Pesa option for KES campaigns; backend will error if Daraja not configured
  const showMpesaOption = isKes;

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setSubmitting(true);
    setError(null);

    try {
      const q = Math.max(1, Math.min(campaign.max_per_txn, Math.trunc(quantity)));
      if (campaign.type === "vote" && !contestantId) throw new Error("Please select a contestant.");

      if (paymentMethod === "mpesa" && isKes) {
        if (!phone.trim()) throw new Error("M-Pesa number is required (e.g. 254712345678)");
        const res = await fetch("/api/daraja/stk-push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: campaign.slug,
            phone: phone.trim(),
            email: email.trim() || undefined,
            payer_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null,
            quantity: q,
            contestant_id: campaign.type === "vote" ? contestantId : null,
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
          throw new Error(json.error ?? "M-Pesa STK Push failed");
        }
        if (json.reference) {
          router.replace(`/${campaign.slug}?ref=${encodeURIComponent(json.reference)}`);
        }
        return;
      }

      if (!email.trim()) throw new Error("Email is required.");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) throw new Error("Please enter a valid email address.");

      const useInline = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: campaign.slug,
          email: email.trim(),
          payer_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null,
          quantity: q,
          contestant_id: campaign.type === "vote" ? contestantId : null,
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
        details?: string;
      } = {};
      if (raw) {
        try {
          json = JSON.parse(raw) as typeof json;
        } catch {
          /* non-JSON */
        }
      }

      if (!res.ok) {
        const errMsg = typeof json.error === "string" && json.error.trim() ? json.error : raw;
        const extra = typeof json.details === "string" ? ` ${json.details}` : "";
        throw new Error(errMsg + extra || `Card payment initialization failed (HTTP ${res.status})`);
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
            router.replace(`/${campaign.slug}?ref=${encodeURIComponent(json.reference!)}`);
          },
          onCancel: () => {
            setSubmitting(false);
          },
          onError: (err: { message?: string }) => {
            setError(err?.message ?? "Payment was not completed.");
            setSubmitting(false);
          },
        });
        return;
      }

      if (json.authorization_url) {
        window.location.href = json.authorization_url;
        return;
      }

      throw new Error("Missing payment link.");
    } catch (e: any) {
      setError(e?.message ?? "Payment initialization failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="pt-24 min-h-screen bg-gray-50">
        <div className="container-custom py-10 max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Campaign not available</h1>
            <p className="text-gray-600 mt-2">
              This link may be inactive or expired. If you believe this is an error, contact the organizer.
            </p>
            {error && (
              <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-semibold">Debug info (local testing)</div>
                  <div className="text-sm mt-1 break-words">{error}</div>
                  <div className="text-xs text-gray-600 mt-2">
                    Common causes: the Supabase SQL hasn't been run yet, the slug doesn't exist, or RLS is hiding an
                    inactive/out-of-window campaign.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isVote = campaign.type === "vote";
  const Icon = isVote ? Vote : Ticket;

  return (
    <div className="pt-24 min-h-screen bg-gray-50">
      <div className="container-custom py-10 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: campaign info */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            {campaign.image_url && (
              <div className="mb-6 -mx-6 -mt-6 rounded-t-xl overflow-hidden">
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  className="w-full h-48 sm:h-56 object-cover"
                />
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="inline-flex w-10 h-10 rounded-lg bg-primary-50 items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-primary-700" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{campaign.title}</h1>
                <p className="text-gray-600 mt-2">{campaign.description ?? "Complete payment to continue."}</p>
              </div>
            </div>

            {ref && (
              <div className="mt-6">
                {txStatus?.status === "success" ? (
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-secondary-700 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-bold text-gray-900 text-lg">Payment confirmed</div>
                        <div className="text-gray-700 mt-2">
                          Your receipt has been sent to your email with your {txStatus?.campaign_type === "vote" ? "vote" : "ticket"} details.
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Reference: <span className="font-mono">{ref}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : txStatus?.status === "failed" || txStatus?.status === "abandoned" ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900">Payment not successful</div>
                        <div className="text-gray-700 mt-1">
                          Try again or contact us if you need help. Reference:{" "}
                          <span className="font-mono">{ref}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                    <div className="flex items-start gap-3">
                      <Loader2 className="w-5 h-5 text-secondary-700 mt-0.5 animate-spin" />
                      <div>
                        <div className="font-semibold text-gray-900">Payment received (processing)</div>
                        <div className="text-gray-700 mt-1">
                          Your payment is being confirmed securely by webhook. Reference:{" "}
                          <span className="font-mono">{ref}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Do not refresh repeatedly—webhook confirmation may take a short moment.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isVote && contestants.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">Contestants</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contestants.map((c) => (
                    <label
                      key={c.id}
                      className={`cursor-pointer rounded-lg border p-3 flex items-center gap-3 ${
                        contestantId === c.id ? "border-primary-600 bg-primary-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="contestant"
                        value={c.id}
                        checked={contestantId === c.id}
                        onChange={() => setContestantId(c.id)}
                        className="w-4 h-4 text-primary-600"
                      />
                      <div className="flex items-center gap-3 min-w-0">
                        {c.image_url ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                          {c.description && <div className="text-sm text-gray-600 truncate">{c.description}</div>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: payment form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900">Pay</h2>
            <p className="text-gray-600 mt-1">
              Choose your payment method. Payment is confirmed securely by webhook.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onPay} className="mt-6 space-y-4">
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
                      <span className="text-lg">📱</span>
                      <span className="font-medium">Pay with M-Pesa</span>
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
                      <span className="font-medium">Pay with Card</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {paymentMethod === "mpesa"
                      ? "Enter your M-Pesa number. You’ll receive a prompt on your phone."
                      : "Pay with Visa, Mastercard, or Airtel Money via Paystack."}
                  </p>
                </div>
              )}

              {!showMpesaOption && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-sm text-gray-700">
                    Pay with <strong>Visa</strong>, <strong>Mastercard</strong>, <strong>M-Pesa</strong>, or{" "}
                    <strong>Airtel Money</strong>.
                  </p>
                </div>
              )}
              {showMpesaOption && paymentMethod === "paystack" && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                  <p className="text-sm text-gray-700">
                    <strong>Pay with Card</strong> — Visa, Mastercard, or Airtel Money via Paystack.
                  </p>
                </div>
              )}

              {paymentMethod === "mpesa" && showMpesaOption && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    M-Pesa phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="254712345678"
                    required={paymentMethod === "mpesa"}
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 254XXXXXXXXX (e.g. 254712345678)</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email {paymentMethod === "mpesa" ? "(optional, for receipt)" : ""}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="you@example.com"
                  required={paymentMethod !== "mpesa"}
                />
                <p className="text-xs text-gray-500 mt-2">
                  {paymentMethod === "mpesa"
                    ? "We'll send your receipt here. Optional but recommended."
                    : process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                      ? "A secure popup will open to choose your payment method and complete payment."
                      : "You will be redirected to Paystack to choose your payment method."}
                </p>
              </div>

              {submitting && (
                <div className="p-4 rounded-lg border border-primary-200 bg-primary-50 text-primary-900">
                  <div className="font-extrabold">Handling Payment</div>
                  <div className="mt-1 text-sm text-primary-900/90">
                    {process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                      ? "Choose your payment method and complete payment in the secure popup."
                      : "Redirecting you to complete payment securely..."}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isVote ? "Votes" : "Tickets"} quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={campaign.max_per_txn}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">Max per transaction: {campaign.max_per_txn}</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
                  <div className="border-t border-gray-200 pt-2">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">
                      {campaign.currency} {total.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full btn-primary inline-flex items-center justify-center gap-2 ${submitting && "opacity-60"}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {paymentMethod === "mpesa"
                      ? "Check your phone for M-Pesa prompt..."
                      : process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
                        ? "Complete payment in popup..."
                        : "Redirecting to payment..."}
                  </>
                ) : paymentMethod === "mpesa" && showMpesaOption ? (
                  "Pay with M-Pesa"
                ) : (
                  "Pay with Card"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
