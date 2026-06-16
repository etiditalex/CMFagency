/**
 * One-off: reconcile a Daraja transaction wrongly marked failed by verify-ref.
 * Usage: node scripts/reconcile-daraja-ref.mjs <reference>
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

require("dotenv").config({ path: path.join(root, ".env.local") });

const { createClient } = require("@supabase/supabase-js");

const ref = process.argv[2] || "cmf_16a12af9d34d4f548462c644de043a5e";

async function loadFinalize() {
  const tsx = await import("tsx/esm/api").catch(() => null);
  if (tsx?.register) {
    tsx.register();
  }
  const mod = await import(pathToFileURL(path.join(root, "lib/daraja-finalize-stk-from-items.ts")).href);
  return mod.finalizeDarajaStkFromMetadataItems;
}

async function stkQuery(checkoutRequestId) {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const shortCode = process.env.MPESA_SHORTCODE;
  const passKey = process.env.MPESA_PASSKEY;
  const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
  let oauthUrl =
    process.env.MPESA_OAUTH_URL ?? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  if (!oauthUrl.includes("grant_type=")) {
    oauthUrl += (oauthUrl.includes("?") ? "&" : "?") + "grant_type=client_credentials";
  }
  const stkQueryUrl =
    process.env.MPESA_STKPUSH_QUERY_URL ?? `${baseUrl}/mpesa/stkpushquery/v1/query`;

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const tokenRes = await fetch(oauthUrl, { headers: { Authorization: `Basic ${auth}` } });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(`Daraja OAuth failed: ${tokenRes.status} ${JSON.stringify(tokenJson)}`);
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g, "").replace(/:/g, "").replace(/T/g, "");
  const password = Buffer.from(`${shortCode}${passKey}${timestamp}`).toString("base64");
  const qRes = await fetch(stkQueryUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const qJson = await qRes.json().catch(() => ({}));
  return { ok: qRes.ok, body: qJson };
}

function parseItems(body) {
  const inner = body?.Result ?? body?.result ?? body;
  const meta = inner?.CallbackMetadata ?? body?.CallbackMetadata;
  return meta?.Item ?? [];
}

function parseResultCode(body) {
  const inner = body?.Result ?? body?.result ?? body;
  const rc = inner?.ResultCode ?? inner?.resultCode ?? body?.ResultCode;
  return Number(rc);
}

async function manualFulfillVote(supabase, tx) {
  if (tx.campaign_type !== "vote" || !tx.contestant_id) {
    throw new Error("Not a vote transaction or missing contestant_id");
  }
  const paidAt = new Date().toISOString();
  const meta = { ...(tx.metadata || {}) };
  delete meta.daraja_result_code;
  delete meta.daraja_result_desc;
  delete meta.reconciled_via;
  meta.reconciled_via = "manual_admin_reconcile";

  await supabase
    .from("transactions")
    .update({
      status: "success",
      verified_at: paidAt,
      paid_at: paidAt,
      metadata: meta,
    })
    .eq("id", tx.id);

  const { error: voteErr } = await supabase.from("votes").upsert(
    {
      transaction_id: tx.id,
      campaign_id: tx.campaign_id,
      contestant_id: tx.contestant_id,
      votes: tx.quantity,
    },
    { onConflict: "transaction_id" }
  );
  if (voteErr) throw new Error(voteErr.message);

  await supabase
    .from("transactions")
    .update({ fulfilled_at: paidAt })
    .eq("id", tx.id)
    .is("fulfilled_at", null);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: tx, error } = await supabase
    .from("transactions")
    .select(
      "id,campaign_id,campaign_type,contestant_id,quantity,amount,currency,reference,status,fulfilled_at,metadata,email,payer_name,coupon_id"
    )
    .eq("reference", ref)
    .maybeSingle();

  if (error || !tx) throw new Error(error?.message ?? "Transaction not found");
  if (tx.status === "success") {
    console.log("Already success:", ref);
    return;
  }

  const checkoutId = String(tx.metadata?.checkout_request_id ?? "").trim();
  let items = [];
  let usedStkQuery = false;

  if (checkoutId) {
    try {
      const query = await stkQuery(checkoutId);
      const rc = parseResultCode(query.body);
      items = parseItems(query.body);
      usedStkQuery = true;
      console.log("STK query result code:", rc, "items:", items.length);
      if (rc === 0 && items.length > 0) {
        const finalizeDarajaStkFromMetadataItems = await loadFinalize();
        const fin = await finalizeDarajaStkFromMetadataItems(supabase, tx, items, "[reconcile]");
        console.log("Finalized via STK query:", fin);
        return;
      }
    } catch (e) {
      console.warn("STK query unavailable, using manual fulfill:", e.message);
    }
  }

  if (!usedStkQuery || items.length === 0) {
    await manualFulfillVote(supabase, tx);
    console.log("Manually marked success and issued votes for:", ref);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
