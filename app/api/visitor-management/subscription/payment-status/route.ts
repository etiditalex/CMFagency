import { NextRequest, NextResponse } from "next/server";

import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";
import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import { visitorDemoSubscriptionState } from "@/lib/visitors/subscription";
import {
  ensureVisitorTrialSubscription,
  getVisitorSubscription,
} from "@/lib/visitors/subscription-db";
import { isVisitorSubscriptionPaymentMetadata } from "@/lib/visitors/subscription-pricing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin, email } = auth;

    if (isAdmin) {
      return NextResponse.json({ exempt: true });
    }

    if (isVisitorDemoAccount(email)) {
      return NextResponse.json({
        exempt: true,
        demo: true,
        subscription: visitorDemoSubscriptionState(),
        payment_completed: true,
      });
    }

    const ref = req.nextUrl.searchParams.get("ref")?.trim() ?? "";
    let txStatus: string | null = null;
    let paymentCompleted = false;

    if (ref) {
      const { data: tx } = await admin
        .from("transactions")
        .select("id,reference,status,metadata,fulfilled_at")
        .eq("reference", ref)
        .maybeSingle();

      if (tx) {
        const meta =
          typeof tx.metadata === "object" && tx.metadata !== null && !Array.isArray(tx.metadata)
            ? (tx.metadata as Record<string, unknown>)
            : {};
        const ownerOk =
          isVisitorSubscriptionPaymentMetadata(meta) &&
          String(meta.visitor_subscription_owner_id ?? "") === userId;

        if (ownerOk) {
          txStatus = String(tx.status ?? "pending");
          paymentCompleted = txStatus === "success";
        }
      }
    }

    let subscription = await getVisitorSubscription(admin, userId);
    if (!subscription.trialEndsAt && subscription.plan === "trial" && !subscription.subscribedAt) {
      subscription = await ensureVisitorTrialSubscription(admin, userId);
    }

    return NextResponse.json({
      reference: ref || null,
      transaction_status: txStatus,
      payment_completed: paymentCompleted,
      subscription,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
