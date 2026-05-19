import { NextRequest, NextResponse } from "next/server";

import { requireVisitorManagementAccess } from "@/lib/visitors/require-visitor-management";
import {
  createVisitorSubscriptionPayment,
  parseSubscriptionPaymentBody,
} from "@/lib/visitors/create-subscription-payment";
import { VISITOR_MANAGEMENT_SUBSCRIPTION_PATH } from "@/lib/visitors/industry-options";
import { isVisitorDemoAccount } from "@/lib/visitors/demo-accounts";
import { VISITOR_PLAN_LABELS } from "@/lib/visitors/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireVisitorManagementAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin, email: callerEmail } = auth;

    if (isAdmin) {
      return NextResponse.json({ error: "Admins do not purchase visitor subscriptions." }, { status: 400 });
    }

    if (isVisitorDemoAccount(callerEmail)) {
      return NextResponse.json(
        { error: "This demo account already has full Enterprise access." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { plan, billingInterval } = parseSubscriptionPaymentBody(body);
    if (!plan) {
      return NextResponse.json({ error: "Choose Professional or Enterprise." }, { status: 400 });
    }

    const useInline = body.inline === true;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return NextResponse.json({ error: "Paystack is not configured on the server." }, { status: 500 });
    }

    const { data: userRow } = await admin.auth.admin.getUserById(userId);
    const email = String(userRow?.user?.email ?? body.email ?? "").trim();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid account email is required for Paystack." }, { status: 400 });
    }

    const payerName =
      String(userRow?.user?.user_metadata?.name ?? body.payer_name ?? body.payerName ?? "").trim() || null;

    const created = await createVisitorSubscriptionPayment({
      admin,
      ownerId: userId,
      email,
      payerName,
      plan,
      billingInterval,
      provider: "paystack",
    });

    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status ?? 400 });
    }

    const origin = req.headers.get("origin") ?? "";
    const callbackBase = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    const callback_url = `${callbackBase.replace(/\/$/, "")}${VISITOR_MANAGEMENT_SUBSCRIPTION_PATH}?ref=${encodeURIComponent(created.reference)}&paid=1`;

    const planLabel = VISITOR_PLAN_LABELS[plan];
    const intervalLabel = billingInterval === "annual" ? "Annual" : "Monthly";

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: created.email,
        amount: created.paystackSubunit,
        currency: created.currency,
        reference: created.reference,
        callback_url,
        channels: ["card", "mobile_money"],
        metadata: {
          campaign_id: created.campaignId,
          campaign_type: "ticket",
          slug: created.metadata.slug,
          visitor_management_subscription: true,
          visitor_subscription_owner_id: userId,
          visitor_subscription_plan: plan,
          visitor_subscription_billing_interval: billingInterval,
          custom_fields: [
            { display_name: "Plan", variable_name: "plan", value: planLabel },
            { display_name: "Billing", variable_name: "billing", value: intervalLabel },
          ],
        },
      }),
    });

    const paystackJson = (await paystackRes.json()) as {
      status?: boolean;
      data?: { authorization_url?: string };
      message?: string;
    };

    if (!paystackRes.ok || !paystackJson?.status) {
      await admin.from("transactions").delete().eq("reference", created.reference);
      return NextResponse.json(
        { error: paystackJson?.message ?? "Paystack initialize failed" },
        { status: 502 }
      );
    }

    if (useInline && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      return NextResponse.json({
        reference: created.reference,
        amount_subunit: created.paystackSubunit,
        email: created.email,
        currency: created.currency,
        channels: ["card", "mobile_money"],
      });
    }

    return NextResponse.json({
      authorization_url: paystackJson.data?.authorization_url,
      reference: created.reference,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
