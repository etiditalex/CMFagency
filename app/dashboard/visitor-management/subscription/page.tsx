"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, CreditCard } from "lucide-react";

import VisitorSubscriptionCheckout from "@/components/fusion-xpress/visitor-management/VisitorSubscriptionCheckout";
import VisitorTrialBanner from "@/components/fusion-xpress/visitor-management/VisitorTrialBanner";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { VISITOR_MANAGEMENT_PATH } from "@/lib/visitors/industry-options";
import {
  formatSubscriptionExpiryDate,
  VISITOR_PLAN_LABELS,
  VISITOR_SUBSCRIPTION_PAID_EVENT,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";
import {
  formatVisitorSubscriptionPriceLabel,
  type PaidVisitorPlan,
  type VisitorBillingInterval,
} from "@/lib/visitors/subscription-pricing";
import { supabase } from "@/lib/supabase";

const PLANS: {
  id: PaidVisitorPlan;
  blurb: string;
}[] = [
  {
    id: "professional",
    blurb:
      "Unlimited visitors, employee attendance, QR PDFs, workplace GPS, summary reports, Excel export, and director notifications.",
  },
  {
    id: "enterprise",
    blurb:
      "Everything in Professional, plus Real Estate staff/CRM teams, separate reporting windows, CRM site GPS visits, and priority support.",
  },
];

export default function VisitorSubscriptionSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature, isAdmin, isVisitorOnly } =
    usePortal();

  const [subscription, setSubscription] = useState<VisitorSubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<VisitorBillingInterval>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PaidVisitorPlan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/visitor-management/subscription", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        subscription?: VisitorSubscriptionState;
        exempt?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load subscription");
      if (json.exempt) {
        router.replace(VISITOR_MANAGEMENT_PATH);
        return;
      }
      if (json.subscription) setSubscription(json.subscription);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !isPortalMember) {
      router.replace("/fusion-xpress/smart-visitor-management/sign-in");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
      return;
    }
    if (isAdmin && !isVisitorOnly) {
      router.replace(VISITOR_MANAGEMENT_PATH);
      return;
    }
    void load();
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    isAdmin,
    isVisitorOnly,
    router,
    load,
  ]);

  useEffect(() => {
    const ref = searchParams?.get("ref")?.trim();
    const paid = searchParams?.get("paid");
    if (!ref || paid !== "1") return;

    let cancelled = false;
    (async () => {
      await fetch("/api/paystack/verify-ref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      }).catch(() => {});

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || cancelled) return;

      const res = await fetch(
        `/api/visitor-management/subscription/payment-status?ref=${encodeURIComponent(ref)}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        payment_completed?: boolean;
        subscription?: VisitorSubscriptionState;
      };
      if (cancelled) return;
      if (json.subscription) setSubscription(json.subscription);
      if (json.payment_completed) {
        setMessage("Payment successful. Your subscription is active.");
        router.replace("/dashboard/visitor-management/subscription");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  useEffect(() => {
    const onPaid = () => {
      void load();
      setSelectedPlan(null);
      setMessage("Payment successful. Thank you for subscribing.");
    };
    window.addEventListener(VISITOR_SUBSCRIPTION_PAID_EVENT, onPaid);
    return () => window.removeEventListener(VISITOR_SUBSCRIPTION_PAID_EVENT, onPaid);
  }, [load]);

  if (authLoading || portalLoading || loading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading subscription…</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-gray-500">
          <Link href={VISITOR_MANAGEMENT_PATH} className="font-semibold text-primary-700 hover:underline">
            ← Visitor Management
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#1a2332] flex items-center gap-2 pb-3 border-b border-[#e5e5e5]">
          <CreditCard className="w-7 h-7 text-primary-600" />
          Subscription
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Subscribe with Paystack (card or mobile money) or M-Pesa. Your plan activates automatically after
          payment is confirmed.
        </p>
      </div>

      <VisitorTrialBanner />

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {message}
        </p>
      ) : null}

      {subscription ? (
        <div className="border border-[#e5e5e5] bg-white p-5 space-y-2">
          <p className="text-sm text-gray-600">
            Current plan:{" "}
            <strong className="text-gray-900">{VISITOR_PLAN_LABELS[subscription.plan]}</strong>
            {subscription.billingInterval ? (
              <span className="text-gray-500"> ({subscription.billingInterval})</span>
            ) : null}
          </p>
          {subscription.isTrial && subscription.trialEndsAt ? (
            <p className="text-sm text-amber-800">
              Trial ends on <strong>{formatSubscriptionExpiryDate(subscription.trialEndsAt)}</strong>
              {subscription.daysLeftOnTrial !== null
                ? ` (${subscription.daysLeftOnTrial} day${subscription.daysLeftOnTrial === 1 ? "" : "s"} left)`
                : ""}
            </p>
          ) : null}
          {subscription.currentPeriodEndsAt && !subscription.isTrial ? (
            <p className="text-sm text-gray-600">
              Renews / ends on{" "}
              <strong>{formatSubscriptionExpiryDate(subscription.currentPeriodEndsAt)}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-2">
        {(["monthly", "annual"] as const).map((interval) => (
          <button
            key={interval}
            type="button"
            onClick={() => setBillingInterval(interval)}
            className={`rounded-lg px-4 py-2 text-sm font-bold capitalize ${
              billingInterval === interval
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {interval}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const prices = formatVisitorSubscriptionPriceLabel(plan.id, billingInterval);
          const isCurrent =
            subscription?.plan === plan.id &&
            (subscription.billingInterval === billingInterval || !subscription.billingInterval);
          return (
            <div
              key={plan.id}
              className={`rounded-xl border bg-white p-5 flex flex-col ${
                selectedPlan === plan.id ? "border-primary-600 ring-2 ring-primary-100" : "border-gray-200"
              }`}
            >
              <h2 className="text-lg font-bold text-gray-900">{VISITOR_PLAN_LABELS[plan.id]}</h2>
              <p className="mt-2 text-lg font-extrabold text-primary-600">{prices.usd}</p>
              <p className="text-xs font-semibold text-gray-600">{prices.kes}</p>
              <p className="mt-3 text-sm text-gray-600 flex-1">{plan.blurb}</p>
              <button
                type="button"
                disabled={isCurrent}
                onClick={() => setSelectedPlan(plan.id)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary-600 px-4 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-50 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-500"
              >
                {isCurrent ? "Current plan" : selectedPlan === plan.id ? "Selected" : "Select plan"}
              </button>
            </div>
          );
        })}
      </div>

      {selectedPlan && subscription?.plan !== selectedPlan ? (
        <VisitorSubscriptionCheckout plan={selectedPlan} billingInterval={billingInterval} />
      ) : null}

      <p className="text-xs text-gray-500">
        Need help?{" "}
        <Link
          href="/contact?subject=Smart%20Visitor%20Management%20Subscription"
          className="text-primary-700 font-semibold hover:underline"
        >
          Contact Changer Fusions
        </Link>
        .
      </p>
    </div>
  );
}
