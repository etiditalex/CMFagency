import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureJobBoardMembershipCampaign } from "@/lib/ensure-job-board-campaign";
import { JOB_BOARD_MEMBERSHIP_SLUG } from "@/lib/job-board-access";

type Body = { phone?: string; email?: string; payer_name?: string | null };

/**
 * Authenticated M-Pesa STK for annual job-board membership (KES 500).
 * Completes in /api/daraja/callback when metadata.job_board_membership is set.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as Body;
    const phoneRaw = (body.phone ?? "").trim().replace(/\s/g, "");
    const email = (body.email ?? userData.user.email ?? "").trim();
    const payerName = (body.payer_name ?? "").trim() || null;

    const phone =
      phoneRaw.startsWith("+254") ? `254${phoneRaw.slice(4)}` :
      phoneRaw.startsWith("254") ? phoneRaw :
      phoneRaw.startsWith("0") ? `254${phoneRaw.slice(1)}` :
      phoneRaw.length === 9 ? `254${phoneRaw}` :
      phoneRaw;

    if (!/^254[17]\d{8}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid M-Pesa number (e.g. 0712345678 or 254712345678)" },
        { status: 400 }
      );
    }

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passKey = process.env.MPESA_PASSKEY;
    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    let oauthUrl = process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
    if (!oauthUrl.includes("grant_type=")) {
      oauthUrl += (oauthUrl.includes("?") ? "&" : "?") + "grant_type=client_credentials";
    }
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;

    if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
      return NextResponse.json(
        { error: "M-Pesa credentials not configured on server." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const campaign = await ensureJobBoardMembershipCampaign(supabaseAdmin);
    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Job-board payment is not set up yet. An admin must sign in once so the system can create the membership campaign, or add it manually in Dashboard → Campaigns.",
        },
        { status: 503 }
      );
    }

    const row = campaign as { is_active?: boolean };
    if (row.is_active === false) {
      return NextResponse.json(
        { error: "Membership payments are paused. Contact support." },
        { status: 400 }
      );
    }

    const reference = `cmf_${crypto.randomUUID().replace(/-/g, "")}`;
    const unitAmount = Number(campaign.unit_amount);
    const quantity = 1;
    const amount = unitAmount * quantity;

    const baseMetadata = {
      slug: campaign.slug,
      campaign_title: campaign.title,
      phone,
      job_board_membership: true,
      job_board_user_id: userId,
    };

    const { error: insertErr } = await supabaseAdmin.from("transactions").insert({
      campaign_id: campaign.id,
      campaign_type: campaign.type,
      reference,
      provider: "daraja",
      email: email || null,
      payer_name: payerName,
      quantity,
      currency: campaign.currency,
      unit_amount: unitAmount,
      amount,
      discount_amount: 0,
      coupon_id: null,
      contestant_id: null,
      status: "pending",
      metadata: baseMetadata,
    });

    if (insertErr) {
      return NextResponse.json(
        { error: insertErr.message || "Could not create transaction" },
        { status: 400 }
      );
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const tokenRes = await fetch(oauthUrl, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        { error: tokenJson.error ?? "Failed to get M-Pesa OAuth token" },
        { status: 502 }
      );
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
    const passStr = `${shortCode}${passKey}${timestamp}`;
    const password = Buffer.from(passStr).toString("base64");
    const callbackBase = `${siteUrl}`.replace(/\/$/, "") || "https://cmfagency.co.ke";
    const callbackUrl = `${callbackBase}/api/daraja/callback`;

    const stkBody = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: shortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: "Job board 1yr",
    };

    const stkRes = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkBody),
    });

    const stkJson = (await stkRes.json()) as {
      ResponseCode?: number;
      CheckoutRequestID?: string;
      CustomerMessage?: string;
      errorMessage?: string;
    };

    if (!stkRes.ok) {
      return NextResponse.json(
        { error: stkJson.errorMessage ?? stkJson.CustomerMessage ?? "STK Push failed" },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.CheckoutRequestID;
    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: stkJson.CustomerMessage ?? "No CheckoutRequestID from Daraja" },
        { status: 502 }
      );
    }

    await supabaseAdmin
      .from("transactions")
      .update({
        metadata: {
          ...baseMetadata,
          checkout_request_id: checkoutRequestId,
        },
      } as { metadata: Record<string, unknown> })
      .eq("reference", reference);

    return NextResponse.json({
      reference,
      checkout_request_id: checkoutRequestId,
      slug: JOB_BOARD_MEMBERSHIP_SLUG,
      message: "Check your phone for the M-Pesa prompt. Enter your PIN to complete payment.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
