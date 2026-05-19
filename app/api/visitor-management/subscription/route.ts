import { NextRequest, NextResponse } from "next/server";

import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";
import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import { visitorDemoSubscriptionState } from "@/lib/visitors/subscription";
import { isVisitorPromoEnterpriseEmail } from "@/lib/visitors/promo-enterprise-accounts";
import {
  hasPaidSubscription,
  isMissingSubscriptionTable,
  resolveVisitorSubscriptionForOwner,
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

    const subscription = await resolveVisitorSubscriptionForOwner(admin, userId, email);

    const { data: row } = await admin
      .from("visitor_management_subscriptions")
      .select("last_payment_reference,last_transaction_id")
      .eq("owner_id", userId)
      .maybeSingle();

    const promoEnterprise =
      isVisitorPromoEnterpriseEmail(email) &&
      subscription.plan === "enterprise" &&
      subscription.isActive &&
      !hasPaidSubscription(row as { last_payment_reference?: string | null; last_transaction_id?: string | null });

    return NextResponse.json({
      exempt: false,
      subscription,
      ...(promoEnterprise ? { promoEnterprise: true } : {}),
    });
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
