"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CreditCard } from "lucide-react";

import { usePortal } from "@/contexts/PortalContext";
import { VISITOR_MANAGEMENT_SUBSCRIPTION_PATH } from "@/lib/visitors/industry-options";
import {
  formatSubscriptionExpiryDate,
  isExemptFromVisitorSubscription,
  type VisitorSubscriptionState,
} from "@/lib/visitors/subscription";
import { supabase } from "@/lib/supabase";

export default function VisitorTrialBanner() {
  const { isAdmin, isVisitorOnly } = usePortal();
  const [subscription, setSubscription] = useState<VisitorSubscriptionState | null>(null);
  const [exempt, setExempt] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isExemptFromVisitorSubscription({ isAdmin, isVisitorOnly })) {
      setExempt(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const res = await fetch("/api/visitor-management/subscription", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          exempt?: boolean;
          subscription?: VisitorSubscriptionState;
        };
        if (cancelled) return;
        setExempt(Boolean(json.exempt));
        if (json.subscription) setSubscription(json.subscription);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, isVisitorOnly]);

  if (loading || exempt || !subscription) return null;

  const expiryLabel = formatSubscriptionExpiryDate(subscription.trialEndsAt);

  if (subscription.isTrial && !subscription.isTrialExpired) {
    return (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="flex flex-wrap items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <span>
            <strong>{VISITOR_TRIAL_DAYS} Day Free Trial</strong> expires on{" "}
            <strong>{expiryLabel}</strong>, please subscribe to the plan you signed up for initially via{" "}
            <Link
              href={VISITOR_MANAGEMENT_SUBSCRIPTION_PATH}
              className="font-bold text-primary-700 underline hover:text-primary-800"
            >
              Settings → Subscription
            </Link>
            .
          </span>
        </p>
      </div>
    );
  }

  if (subscription.isTrialExpired || !subscription.isActive) {
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="flex flex-wrap items-start gap-2">
          <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Your free trial has ended. Please subscribe via{" "}
            <Link
              href={VISITOR_MANAGEMENT_SUBSCRIPTION_PATH}
              className="font-bold text-primary-700 underline"
            >
              Settings → Subscription
            </Link>{" "}
            to continue using Smart Visitor Management.
          </span>
        </p>
      </div>
    );
  }

  return null;
}