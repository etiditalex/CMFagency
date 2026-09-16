import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  loadEventTicketPdfInput,
  ticketNumberFromReference,
  ticketPdfFilename,
} from "@/lib/event-ticket";
import { buildEventTicketPdf } from "@/lib/event-ticket-pdf";
import { isLipaPolePoleMetadata } from "@/lib/lipa-pole-pole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REF_PATTERN = /^[A-Za-z0-9._-]{5,160}$/;

function asMeta(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

export async function GET(req: NextRequest) {
  const ref = (req.nextUrl.searchParams.get("ref") ?? "").trim();
  if (!ref || !REF_PATTERN.test(ref)) {
    return NextResponse.json({ error: "Missing ticket reference" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("transactions")
    .select("reference,status,email,payer_name,amount,quantity,campaign_type,metadata")
    .eq("reference", ref)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const tx = data as {
    reference: string;
    status?: string | null;
    email?: string | null;
    payer_name?: string | null;
    amount?: number | null;
    quantity?: number | null;
    campaign_type?: string | null;
    metadata?: unknown;
  };

  if (String(tx.status ?? "") !== "success") {
    return NextResponse.json({ error: "Ticket is not ready yet" }, { status: 404 });
  }

  const meta = asMeta(tx.metadata);
  if (tx.campaign_type === "vote" || meta.merchandise_cart) {
    return NextResponse.json({ error: "Not a ticket purchase" }, { status: 400 });
  }
  if (
    isLipaPolePoleMetadata(meta) &&
    !meta.lipa_pole_pole_plan_completed &&
    Number(meta.lipa_pole_pole_balance_remaining_kes) > 0
  ) {
    return NextResponse.json({ error: "Finish paying the balance to download this ticket." }, { status: 400 });
  }

  const slug = String(meta.slug || meta.campaign_slug || "event");
  const campaignTitle = String(meta.campaign_title || meta.slug || "Event");
  const holderName = tx.payer_name?.trim() || tx.email?.trim() || "Guest";
  const ticketNumber = ticketNumberFromReference(tx.reference, slug, tx.campaign_type, false);
  const ticket = await loadEventTicketPdfInput(supabase, {
    slug,
    campaignTitle,
    holderName,
    reference: tx.reference,
    ticketNumber,
    amountKes: Number(tx.amount || 0),
    quantity: tx.quantity ?? 1,
    meta,
  });

  try {
    const bytes = await buildEventTicketPdf(ticket);
    const filename = ticketPdfFilename(ticket.ticketId);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to build ticket";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
