import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchContestantNameById } from "@/lib/contestant-name-for-receipt";
import { requireGateAccess } from "@/lib/require-gate-access";
import { sendReceiptEmail } from "@/lib/send-receipt-email";

export const runtime = "nodejs";

const REF_PATTERN = /^[A-Za-z0-9._-]{5,160}$/;

async function loadTicketPurchaseForUser(reference: string, token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ error: "Server configuration missing" }, { status: 500 }) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: row, error } = await supabase
    .from("transactions")
    .select("id, reference, status, campaign_type, revoked_at, payer_name, email")
    .eq("reference", reference)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!row) return { error: NextResponse.json({ error: "Ticket purchase not found." }, { status: 404 }) };

  const tx = row as {
    id: string;
    reference: string;
    status?: string;
    campaign_type?: string | null;
    revoked_at?: string | null;
    payer_name?: string | null;
    email?: string | null;
  };

  if (tx.campaign_type === "vote") {
    return { error: NextResponse.json({ error: "Vote transactions cannot be changed here." }, { status: 400 }) };
  }
  if (tx.status !== "success") {
    return { error: NextResponse.json({ error: "Only successful purchases can be managed." }, { status: 400 }) };
  }

  return { tx };
}

function bearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference: rawRef } = await ctx.params;
  const reference = decodeURIComponent(rawRef ?? "").trim();
  if (!reference || !REF_PATTERN.test(reference)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: tx, error } = await supabase
    .from("transactions")
    .select("reference,email,payer_name,amount,currency,quantity,campaign_type,metadata,provider,contestant_id,revoked_at,status")
    .eq("reference", reference)
    .neq("campaign_type", "vote")
    .eq("status", "success")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!tx) return NextResponse.json({ error: "Ticket purchase not found." }, { status: 404 });

  const row = tx as {
    reference: string;
    email?: string | null;
    payer_name?: string | null;
    amount?: number | null;
    currency?: string | null;
    quantity?: number | null;
    campaign_type?: string | null;
    metadata?: unknown;
    provider?: string | null;
    contestant_id?: string | null;
    revoked_at?: string | null;
    status?: string | null;
  };

  if (row.revoked_at) {
    return NextResponse.json({ error: "Ticket is revoked. Unrevoke before sending." }, { status: 400 });
  }

  const toEmail = row.email?.trim?.();
  if (!toEmail) return NextResponse.json({ error: "No email on this purchase." }, { status: 400 });

  const meta =
    (typeof row.metadata === "object" && (row.metadata as Record<string, unknown>)) || {};
  const provider = row.provider ?? "paystack";
  const isMpesa = provider === "daraja";
  const mpesaReceipt = (meta.mpesa_receipt as string)?.trim() || undefined;

  const holderName = row.payer_name?.trim?.() || toEmail;
  const ticketSuffix = reference.replace(/^cmf_/, "").slice(-8).toUpperCase();
  const slug = (meta.slug as string) || "event";
  const prefix = String(slug).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const typeCode = row.campaign_type === "vote" ? "VOT" : meta.merchandise_cart ? "ORD" : "TKT";
  const ticketNumber = `${prefix}-${typeCode}-${ticketSuffix}`;
  const campaignTitle = (meta.campaign_title as string) || slug;
  const typeLabel = (row.campaign_type === "vote" ? "Vote" : meta.merchandise_cart ? "Order" : "Ticket") as
    | "Ticket"
    | "Vote"
    | "Order";
  const quantityLabel =
    row.campaign_type === "vote" ? "votes" : meta.merchandise_cart ? "items" : "tickets";
  const currency = String(row.currency || "KES").toUpperCase();
  const amount = Number(row.amount || 0);
  const quantity = row.quantity ?? 0;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const viewTicketsUrl =
    slug && slug !== "event" ? `${baseUrl}/${slug}?ref=${encodeURIComponent(reference)}` : undefined;
  const downloadReceiptUrl = `${baseUrl}/receipt?ref=${encodeURIComponent(reference)}`;
  const rsvpUrl = `${baseUrl}/invite?ref=${encodeURIComponent(reference)}`;

  let eventLocation: string | undefined;
  let eventDate: string | undefined;
  let eventTime: string | undefined;
  if (slug && slug !== "event") {
    const { data: eventRow } = await auth.admin
      .from("fusion_events")
      .select("location, venue, event_date, time")
      .eq("ticket_campaign_slug", slug)
      .maybeSingle();
    if (eventRow) {
      const loc = (eventRow as { location?: string | null }).location;
      const venue = (eventRow as { venue?: string | null }).venue;
      eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || undefined;
      const ed = (eventRow as { event_date?: string | null }).event_date;
      if (ed) {
        eventDate = new Date(ed).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      eventTime = (eventRow as { time?: string | null }).time ?? undefined;
    }
  }

  const votedForName =
    row.campaign_type === "vote"
      ? await fetchContestantNameById(auth.admin, row.contestant_id)
      : undefined;

  const result = await sendReceiptEmail({
    to: toEmail,
    campaignTitle,
    campaignSlug: slug !== "event" ? slug : undefined,
    typeLabel,
    ticketNumber,
    holderName,
    amount: `${currency} ${amount.toLocaleString()}`,
    quantity: `${quantity} ${quantityLabel}`,
    reference,
    variant: isMpesa ? "mpesa" : "paystack",
    mpesaReceipt: isMpesa ? mpesaReceipt : undefined,
    votedForName,
    viewTicketsUrl,
    downloadReceiptUrl,
    eventLocation,
    eventDate,
    eventTime,
    rsvpUrl: typeLabel === "Ticket" ? rsvpUrl : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Email not configured" },
      { status: result.error?.includes("not configured") ? 503 : 502 }
    );
  }

  return NextResponse.json({ sent: true, reference, email: toEmail });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference: rawRef } = await ctx.params;
  const reference = decodeURIComponent(rawRef ?? "").trim();
  if (!reference || !REF_PATTERN.test(reference)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  const loaded = await loadTicketPurchaseForUser(reference, token);
  if ("error" in loaded) return loaded.error;
  const { tx } = loaded;

  if (tx.revoked_at) {
    return NextResponse.json({ error: "Ticket is already revoked." }, { status: 400 });
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await auth.admin
    .from("transactions")
    .update({ revoked_at: revokedAt })
    .eq("id", tx.id)
    .select("reference, revoked_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ticket purchase not found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    reference: (data as { reference?: string }).reference ?? reference,
    revoked_at: (data as { revoked_at?: string }).revoked_at ?? revokedAt,
    payer_name: tx.payer_name,
    email: tx.email,
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference: rawRef } = await ctx.params;
  const reference = decodeURIComponent(rawRef ?? "").trim();
  if (!reference || !REF_PATTERN.test(reference)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  const loaded = await loadTicketPurchaseForUser(reference, token);
  if ("error" in loaded) return loaded.error;
  const { tx } = loaded;

  const { error } = await auth.admin.from("transactions").delete().eq("id", tx.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deleted_reference: reference,
    payer_name: tx.payer_name,
    email: tx.email,
  });
}
