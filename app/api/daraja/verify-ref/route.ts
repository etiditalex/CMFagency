import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  finalizeDarajaStkFromMetadataItems,
  type CallbackMetadataItem,
} from "@/lib/daraja-finalize-stk-from-items";

export const dynamic = "force-dynamic";

function parseStkQueryResult(body: unknown): { resultCode: number; items: CallbackMetadataItem[] } {
  if (!body || typeof body !== "object") return { resultCode: -1, items: [] };
  const o = body as Record<string, unknown>;
  const inner = (o.Result as Record<string, unknown>) ?? o["result"];
  const root =
    inner && typeof inner === "object" ? (inner as Record<string, unknown>) : o;
  const rcRaw = root.ResultCode ?? root.resultCode ?? o.ResultCode;
  const resultCode = Number(rcRaw ?? -1);
  const meta = (root.CallbackMetadata ?? o.CallbackMetadata) as { Item?: CallbackMetadataItem[] } | undefined;
  const items = meta?.Item ?? [];
  return { resultCode, items };
}

/**
 * Queries Safaricom STK status for a pending M-Pesa transaction and finalizes it when paid.
 * Same as Paystack verify-ref: safe to call repeatedly when webhooks are slow.
 *
 * POST JSON: { "ref": "cmf_..." }
 */
export async function POST(req: Request) {
  let body: { ref?: string };
  try {
    body = (await req.json()) as { ref?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = String(body?.ref ?? "").trim();
  if (!ref || !/^[A-Za-z0-9._-]{6,128}$/.test(ref)) {
    return NextResponse.json({ error: "Invalid ref" }, { status: 400 });
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
  const stkQueryUrl = process.env.MPESA_STKPUSH_QUERY_URL ?? `${baseUrl}/mpesa/stkpushquery/v1/query`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  if (!consumerKey || !consumerSecret || !shortCode || !passKey) {
    return NextResponse.json({ error: "M-Pesa not configured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select(
      "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id,provider"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (String((tx as { provider?: string }).provider) !== "daraja") {
    return NextResponse.json({ error: "Not an M-Pesa transaction" }, { status: 400 });
  }

  const status = String((tx as { status?: string }).status ?? "pending");
  if (status !== "pending") {
    return NextResponse.json({ ok: true, status, completed: status === "success" });
  }

  const meta =
    (typeof (tx as { metadata?: unknown }).metadata === "object" &&
      (tx as { metadata?: Record<string, unknown> }).metadata) ||
    {};
  const checkoutRequestId = String(meta.checkout_request_id ?? "").trim();
  if (!checkoutRequestId) {
    return NextResponse.json({ ok: false, error: "Missing checkout_request_id" }, { status: 400 });
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const tokenRes = await fetch(oauthUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return NextResponse.json({ error: "Daraja OAuth failed", detail: tokenJson.error }, { status: 502 });
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
  const passStr = `${shortCode}${passKey}${timestamp}`;
  const password = Buffer.from(passStr).toString("base64");

  const stkQueryBody = {
    BusinessShortCode: shortCode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId,
  };

  const queryRes = await fetch(stkQueryUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(stkQueryBody),
  });

  const queryJson: unknown = await queryRes.json().catch(() => ({}));
  const { resultCode, items } = parseStkQueryResult(queryJson);

  if (resultCode !== 0) {
    return NextResponse.json({
      ok: true,
      status: "pending",
      daraja_result_code: resultCode,
    });
  }

  const { data: tx2 } = await supabase
    .from("transactions")
    .select(
      "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (!tx2) {
    return NextResponse.json({ ok: false, error: "Transaction disappeared" }, { status: 500 });
  }
  const st2 = String((tx2 as { status?: string }).status ?? "pending");
  if (st2 !== "pending") {
    return NextResponse.json({ ok: true, status: st2, completed: st2 === "success" });
  }

  const fin = await finalizeDarajaStkFromMetadataItems(supabase, tx2, items, "[Daraja verify-ref]");

  return NextResponse.json({
    ok: true,
    status: fin === "amount_mismatch" ? "failed" : "success",
    completed: fin === "completed",
  });
}
