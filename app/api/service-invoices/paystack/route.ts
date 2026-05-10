import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { getSeoPackageById } from "@/lib/service-packages-catalog";
import { ensureSeoServiceCampaign } from "@/lib/ensure-service-seo-campaigns";

export const dynamic = "force-dynamic";

type Body = {
  access_token?: string;
  inline?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const accessToken = (body.access_token ?? "").trim();
    const useInline = body.inline === true;

    if (!accessToken) return NextResponse.json({ error: "access_token is required" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !paystackSecret) {
      return NextResponse.json({ error: "Payment not configured on server" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { data: invoice, error: invErr } = await supabaseAdmin
      .from("service_invoices")
      .select(
        "id,access_token,status,amount_kes,package_slug,customer_email,customer_name,customer_phone"
      )
      .eq("access_token", accessToken)
      .maybeSingle();

    if (invErr || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const inv = invoice as {
      id: string;
      status: string;
      amount_kes: number;
      package_slug: string;
      customer_email: string;
      customer_name: string;
      customer_phone: string | null;
    };

    if (inv.status !== "unpaid") {
      return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });
    }

    const pkg = getSeoPackageById(inv.package_slug);
    if (!pkg || pkg.amountKes !== inv.amount_kes) {
      return NextResponse.json({ error: "Invoice package mismatch" }, { status: 400 });
    }

    const campaign = await ensureSeoServiceCampaign(supabaseAdmin, pkg.campaignSlug);
    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Could not resolve SEO billing campaign. Ensure an admin exists and database migrations are applied.",
        },
        { status: 500 }
      );
    }

    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;
    const amountMainRounded = Math.round(inv.amount_kes);
    const amountInSubunit = amountMainRounded * 100;

    const txMetadata: Record<string, unknown> = {
      slug: campaign.slug,
      campaign_title: campaign.title,
      paystack_amount_subunit: amountInSubunit,
      service_invoice_id: inv.id,
      invoice_access_token: accessToken,
    };

    const insertPayload = {
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "paystack",
      email: inv.customer_email,
      payer_name: inv.customer_name,
      quantity: 1,
      currency: campaign.currency,
      unit_amount: campaign.unit_amount,
      amount: amountMainRounded,
      discount_amount: 0,
      coupon_id: null,
      contestant_id: null,
      status: "pending",
      metadata: txMetadata,
    };

    const { error: insertErr } = await supabaseAdmin.from("transactions").insert(insertPayload as Record<string, unknown>);
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message ?? "Could not start payment" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "";
    const callbackBase = process.env.NEXT_PUBLIC_SITE_URL ?? origin;
    const callback_url = `${callbackBase.replace(/\/$/, "")}/invoice/${encodeURIComponent(accessToken)}?ref=${encodeURIComponent(reference)}`;

    const invoiceLabel = `SERVICE-${inv.id.slice(0, 8).toUpperCase()}`;
    const customFields = [
      { display_name: "Invoice", variable_name: "invoice", value: invoiceLabel },
      { display_name: "Package", variable_name: "package", value: pkg.title },
    ];

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: inv.customer_email,
        amount: amountInSubunit,
        currency: campaign.currency,
        reference,
        callback_url,
        channels: ["card", "mobile_money"],
        metadata: {
          campaign_id: campaign.id,
          campaign_type: campaign.type,
          slug: campaign.slug,
          service_invoice_id: inv.id,
          custom_fields: customFields,
        },
      }),
    });

    const paystackJson = (await paystackRes.json()) as { status?: boolean; data?: { authorization_url?: string }; message?: string };

    if (!paystackRes.ok || !paystackJson?.status) {
      await supabaseAdmin.from("transactions").delete().eq("reference", reference);
      return NextResponse.json(
        { error: paystackJson?.message ?? "Paystack initialize failed" },
        { status: 502 }
      );
    }

    if (useInline && process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
      return NextResponse.json({
        reference,
        amount_subunit: amountInSubunit,
        email: inv.customer_email,
        currency: campaign.currency,
      });
    }

    return NextResponse.json({
      authorization_url: paystackJson.data?.authorization_url,
      reference,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
