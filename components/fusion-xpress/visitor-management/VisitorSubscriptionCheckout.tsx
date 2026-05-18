"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PaystackPop from "@paystack/inline-js";
import { Loader2, Smartphone } from "lucide-react";

import {
  formatVisitorSubscriptionPriceLabel,
  type PaidVisitorPlan,
  type VisitorBillingInterval,
} from "@/lib/visitors/subscription-pricing";
import { VISITOR_PLAN_LABELS } from "@/lib/visitors/subscription";
import { supabase } from "@/lib/supabase";

type Props = {
  plan: PaidVisitorPlan;
  billingInterval: VisitorBillingInterval;
  onPaid: () => void;
  disabled?: boolean;
};

export default function VisitorSubscriptionCheckout({
  plan,
  billingInterval,
  onPaid,
  disabled,
}: Props) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<"paystack" | "mpesa" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prices = formatVisitorSubscriptionPriceLabel(plan, billingInterval);
  const pubKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollPayment = useCallback(
    (reference: string) => {
      stopPoll();
      const start = Date.now();
      pollRef.current = setInterval(async () => {
        if (Date.now() - start > 120000) {
          stopPoll();
          return;
        }
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token) return;
          const res = await fetch(
            `/api/visitor-management/subscription/payment-status?ref=${encodeURIComponent(reference)}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
          );
          const json = (await res.json().catch(() => ({}))) as {
            payment_completed?: boolean;
            subscription?: { plan?: string };
          };
          if (json.payment_completed || json.subscription?.plan === plan) {
            stopPoll();
            setMsg("Payment received. Your plan is now active.");
            onPaid();
          }
        } catch {
          /* keep polling */
        }
      }, 4000);
    },
    [onPaid, plan, stopPoll]
  );

  useEffect(() => () => stopPoll(), [stopPoll]);

  const payPaystack = async () => {
    setErr(null);
    setMsg(null);
    setBusy("paystack");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");

      const useInline = !!pubKey;
      const res = await fetch("/api/visitor-management/subscription/paystack", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, billingInterval, inline: useInline }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        authorization_url?: string;
        reference?: string;
        amount_subunit?: number;
        email?: string;
        currency?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Paystack could not start");

      if (useInline && json.reference && json.amount_subunit != null && json.email && json.currency) {
        const paystack = new PaystackPop();
        paystack.newTransaction({
          key: pubKey!,
          email: json.email,
          amount: json.amount_subunit,
          currency: json.currency,
          reference: json.reference,
          channels: ["card", "mobile_money"],
          onSuccess: async () => {
            await fetch("/api/paystack/verify-ref", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ref: json.reference }),
            }).catch(() => {});
            pollPayment(json.reference!);
            setMsg("Verifying payment…");
          },
          onCancel: () => setBusy(null),
        });
        return;
      }

      if (json.authorization_url) {
        window.location.href = json.authorization_url;
        return;
      }
      throw new Error("Missing Paystack redirect URL");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  const payMpesa = async () => {
    setErr(null);
    setMsg(null);
    const p = phone.trim().replace(/\s/g, "");
    if (!p) {
      setErr("Enter your M-Pesa phone number.");
      return;
    }
    setBusy("mpesa");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");

      const res = await fetch("/api/visitor-management/subscription/mpesa", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, billingInterval, phone: p }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string; reference?: string };
      if (!res.ok) throw new Error(json.error ?? "M-Pesa could not start");
      setMsg(json.message ?? "Check your phone for the STK prompt.");
      if (json.reference) pollPayment(json.reference);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "M-Pesa failed");
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-gray-900">
          Pay for {VISITOR_PLAN_LABELS[plan]} — {billingInterval === "annual" ? "Annual" : "Monthly"}
        </p>
        <p className="mt-1 text-sm text-gray-600">
          <span className="font-semibold text-primary-700">{prices.aud}</span>
          <span className="mx-2 text-gray-400">·</span>
          <span className="font-semibold text-gray-800">{prices.kes}</span> via M-Pesa
        </p>
      </div>

      {err ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      ) : null}
      {msg ? (
        <p className="rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2 text-sm text-secondary-900">
          {msg}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={disabled || busy !== null}
          onClick={() => void payPaystack()}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {busy === "paystack" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Pay with Paystack
        </button>
        <div className="flex min-w-[240px] flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="tel"
            placeholder="M-Pesa: 254712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={disabled || busy !== null}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <button
            type="button"
            disabled={disabled || busy !== null}
            onClick={() => void payMpesa()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 border-secondary-600 bg-white px-4 py-2.5 text-sm font-bold text-secondary-800 hover:bg-secondary-50 disabled:opacity-50"
          >
            {busy === "mpesa" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Smartphone className="w-4 h-4" />
            )}
            M-Pesa
          </button>
        </div>
      </div>
    </div>
  );
}