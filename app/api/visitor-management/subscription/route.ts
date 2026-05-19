import { NextRequest, NextResponse } from "next/server";

import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";
import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import { visitorDemoSubscriptionState } from "@/lib/visitors/subscription";
import {
  ensureVisitorTrialSubscription,
  getVisitorSubscription,
  isMissingSubscriptionTable,
} from "@/lib/visitors/subscription-db";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin, email } = auth;

    if (isAdmin) {
      return NextResponse.json({
        exempt: true,
        subscription: null,
      });
    }

    if (isVisitorDemoAccount(email)) {
      return NextResponse.json({
        exempt: true,
        demo: true,
        subscription: visitorDemoSubscriptionState(),
      });
    }

    let subscription = await getVisitorSubscription(admin, userId);
    if (!subscription.trialEndsAt && subscription.plan === "trial" && !subscription.subscribedAt) {
      subscription = await ensureVisitorTrialSubscription(admin, userId);
    }

    return NextResponse.json({ exempt: false, subscription });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingSubscriptionTable(e)) {
      return NextResponse.json(
        {
          setupRequired: true,
          message: "Run database/visitor_management_patch_03_subscriptions.sql in Supabase.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT() {
  return NextResponse.json(
    {
      error:
        "Plan changes require payment. Use Paystack or M-Pesa from Settings → Subscription.",
    },
    { status: 405 }
  );
}
