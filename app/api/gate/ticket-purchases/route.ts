import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { contactFromTransactionMetadata } from "@/lib/transaction-contact";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

/**
 * Successful ticket purchases for Gate staff (includes referral contact from metadata).
 * RLS limits rows to the portal member's campaigns.
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
  const eventSlug = searchParams.get("event_slug")?.trim() || null;
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) ? Math.trunc(limitRaw) : DEFAULT_LIMIT));

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const [{ data: pmRow }, { data: auRow }] = await Promise.all([
    supabaseAdmin.from("portal_members").select("role, features").eq("user_id", user.id).maybeSingle(),
    supabaseAdmin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const isPortal = !!pmRow || !!auRow;
  const hasReports =
    !!auRow ||
    (!!pmRow &&
      ((pmRow.role === "admin" || pmRow.role === "manager") ||
        (Array.isArray((pmRow as { features?: string[] }).features) &&
          (pmRow as { features?: string[] }).features?.includes("reports"))));
  if (!isPortal || !hasReports) {
    return NextResponse.json({ error: "Gate access requires reports permission" }, { status: 403 });
  }

  let filterCampaignId: string | null = null;
  if (eventSlug) {
    const { data: fe } = await supabaseAdmin
      .from("fusion_events")
      .select("ticket_campaign_slug")
      .eq("slug", eventSlug)
      .maybeSingle();
    const campaignSlug = (fe as { ticket_campaign_slug?: string | null } | null)?.ticket_campaign_slug;
    if (!campaignSlug) return NextResponse.json({ purchases: [] });

    const { data: camp } = await supabase
      .from("campaigns")
      .select("id")
      .eq("slug", campaignSlug)
      .maybeSingle();
    filterCampaignId = (camp as { id?: string } | null)?.id ?? null;
    if (!filterCampaignId) return NextResponse.json({ purchases: [] });
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
    campaign_type?: string | null;
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

  const purchases = txRows.map((t) => {
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

  return NextResponse.json({ purchases });
}
