import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { contactFromTransactionMetadata } from "@/lib/transaction-contact";
import {
  buildTicketPurchasesPdfBuffer,
  buildTicketPurchasesXlsxBuffer,
  GATE_TICKET_PURCHASES_PDF_MIME,
  GATE_TICKET_PURCHASES_XLSX_MIME,
  type GateTicketPurchaseExportRow,
  ticketPurchasesExportFilename,
} from "@/lib/gate-ticket-purchases-export";

const DEFAULT_LIMIT = 2000;
const MAX_LIMIT = 5000;

/**
 * Export gate ticket purchases as Excel (.xlsx) or PDF.
 * Auth matches Gate ticket purchases list (portal + reports).
 * Query: ?format=xlsx|pdf&event_slug=optional
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { searchParams } = new URL(req.url);
  const formatRaw = (searchParams.get("format") ?? "xlsx").trim().toLowerCase();
  const format = formatRaw === "pdf" ? "pdf" : formatRaw === "xlsx" || formatRaw === "excel" ? "xlsx" : null;
  if (!format) {
    return NextResponse.json({ error: "format must be xlsx or pdf" }, { status: 400 });
  }

  const eventSlug = searchParams.get("event_slug")?.trim() || null;
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : DEFAULT_LIMIT));

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const [{ data: pmRow }, { data: auRow }] = await Promise.all([
    supabaseAdmin.from("portal_members").select("role, features").eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const isPortal = !!pmRow || !!auRow;
  const hasReports =
    !!auRow ||
    (!!pmRow &&
      (pmRow.role === "admin" ||
        pmRow.role === "manager" ||
        (Array.isArray((pmRow as { features?: string[] }).features) &&
          (pmRow as { features?: string[] }).features?.includes("reports"))));
  if (!isPortal || !hasReports) {
    return NextResponse.json({ error: "Gate access requires reports permission" }, { status: 403 });
  }

  let filterCampaignId: string | null = null;
  let eventTitle: string | null = null;
  if (eventSlug) {
    const { data: fe } = await supabaseAdmin
      .from("fusion_events")
      .select("ticket_campaign_slug, title")
      .eq("slug", eventSlug)
      .maybeSingle();
    const ev = fe as { ticket_campaign_slug?: string | null; title?: string | null } | null;
    eventTitle = ev?.title?.trim() || eventSlug;
    const campaignSlug = ev?.ticket_campaign_slug;
    if (!campaignSlug) {
      return emptyFileResponse(format, eventSlug, eventTitle);
    }

    const { data: camp } = await supabase.from("campaigns").select("id").eq("slug", campaignSlug).maybeSingle();
    filterCampaignId = (camp as { id?: string } | null)?.id ?? null;
    if (!filterCampaignId) {
      return emptyFileResponse(format, eventSlug, eventTitle);
    }
  }

  let txQuery = supabase
    .from("transactions")
    .select(
      "reference,created_at,checked_in_at,revoked_at,payer_name,email,amount,currency,quantity,campaign_type,campaign_id,status,metadata"
    )
    .eq("status", "success")
    .neq("campaign_type", "vote")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filterCampaignId) {
    txQuery = txQuery.eq("campaign_id", filterCampaignId);
  }

  const { data: rows, error } = await txQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const txRows = (rows ?? []) as Array<{
    reference: string;
    created_at: string;
    checked_in_at: string | null;
    revoked_at?: string | null;
    payer_name?: string | null;
    email?: string | null;
    amount: number;
    currency?: string | null;
    quantity?: number | null;
    campaign_id: string;
    metadata?: unknown;
  }>;

  const campaignIdsSeen = [...new Set(txRows.map((r) => r.campaign_id))];
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,title,slug")
    .in("id", campaignIdsSeen.length ? campaignIdsSeen : ["__none__"]);
  const campaignTitleById: Record<string, string> = {};
  for (const c of (campaigns ?? []) as Array<{ id: string; title?: string; slug?: string }>) {
    campaignTitleById[c.id] = String(c.title || c.slug || c.id);
  }

  const purchases: GateTicketPurchaseExportRow[] = txRows.map((t) => {
    const contact = contactFromTransactionMetadata(t.metadata);
    return {
      reference: t.reference,
      purchased_at: t.created_at,
      checked_in_at: t.checked_in_at,
      revoked_at: t.revoked_at ?? null,
      campaign: campaignTitleById[t.campaign_id] ?? t.campaign_id,
      payer_name: (t.payer_name ?? "").trim() || "—",
      email: (t.email ?? "").trim() || "—",
      payer_phone: contact.payer_phone ?? "—",
      referred_by: contact.referred_by ?? "—",
      referrer_phone: contact.referrer_phone ?? "—",
      amount: t.amount,
      currency: String(t.currency ?? "").toUpperCase(),
      quantity: t.quantity ?? 0,
    };
  });

  return fileResponse(format, purchases, eventSlug, eventTitle);
}

async function emptyFileResponse(
  format: "xlsx" | "pdf",
  eventSlug: string | null,
  eventTitle: string | null
) {
  return fileResponse(format, [], eventSlug, eventTitle);
}

async function fileResponse(
  format: "xlsx" | "pdf",
  purchases: GateTicketPurchaseExportRow[],
  eventSlug: string | null,
  eventTitle: string | null
) {
  const filename = ticketPurchasesExportFilename(format, eventSlug);
  if (format === "pdf") {
    const buffer = await buildTicketPurchasesPdfBuffer(purchases, { eventTitle });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": GATE_TICKET_PURCHASES_PDF_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = await buildTicketPurchasesXlsxBuffer(purchases);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": GATE_TICKET_PURCHASES_XLSX_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
