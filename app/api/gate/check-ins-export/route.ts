import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Export gate attendance CSV: paid entries after scan; free registrations from signup with optional gate time.
 * Same auth as Gate: portal member with reports. RLS limits transactions to user's campaigns.
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
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: pm } = await supabaseAdmin.from("portal_members").select("role, features").eq("user_id", user.id).maybeSingle();
  const { data: au } = await supabaseAdmin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const isPortal = !!pm || !!au;
  const hasReports =
    !!au ||
    (!!pm && ((pm.role === "admin" || pm.role === "manager") || (Array.isArray((pm as { features?: string[] }).features) && (pm as { features?: string[] }).features?.includes("reports"))));
  if (!isPortal || !hasReports) {
    return NextResponse.json({ error: "Gate access requires reports permission" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const eventSlug = searchParams.get("event_slug")?.trim() || null;

  const { data: rows, error } = await supabase
    .from("transactions")
    .select("reference,checked_in_at,payer_name,email,amount,currency,quantity,campaign_type,campaign_id,status")
    .not("checked_in_at", "is", null)
    .eq("status", "success")
    .order("checked_in_at", { ascending: false })
    .limit(10000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let txRows = (rows ?? []) as Array<{
    reference: string;
    checked_in_at: string | null;
    payer_name?: string | null;
    email?: string | null;
    amount: number;
    currency?: string | null;
    quantity?: number | null;
    campaign_type?: string | null;
    campaign_id: string;
    status?: string | null;
  }>;

  const campaignIdsSeen = [...new Set(txRows.map((r) => r.campaign_id))];
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,title,slug")
    .in("id", campaignIdsSeen.length ? campaignIdsSeen : ["__none__"]);
  const campaignTitleById: Record<string, string> = {};
  const campaignsList = (campaigns ?? []) as Array<{ id: string; title?: string; slug?: string }>;
  for (const c of campaignsList) {
    campaignTitleById[c.id] = String(c.title || c.slug || c.id);
  }

  if (eventSlug) {
    const fe = await supabaseAdmin.from("fusion_events").select("ticket_campaign_slug").eq("slug", eventSlug).maybeSingle();
    const ev = fe.data as { ticket_campaign_slug?: string | null } | null;
    const campaignSlug = ev?.ticket_campaign_slug;
    const campRow = campaignsList.find((c) => c.slug === campaignSlug);
    const campId = campRow?.id ?? null;
    if (campId) txRows = txRows.filter((t) => t.campaign_id === campId);
    else txRows = [];
  }

  let attendeeQuery = supabaseAdmin
    .from("event_attendees")
    .select("reference,checked_in_at,created_at,name,email,event_slug,additional_guests")
    .is("transaction_id", null)
    .order("created_at", { ascending: false })
    .limit(10000);
  if (eventSlug) attendeeQuery = attendeeQuery.eq("event_slug", eventSlug);
  const { data: attendeeRows, error: attendeeErr } = await attendeeQuery;
  if (attendeeErr) return NextResponse.json({ error: attendeeErr.message }, { status: 500 });

  const regRows = (attendeeRows ?? []) as Array<{
    reference: string;
    checked_in_at: string | null;
    created_at?: string | null;
    name?: string | null;
    email?: string | null;
    event_slug?: string | null;
    additional_guests?: number | null;
  }>;
  const eventSlugsSeen = [...new Set(regRows.map((r) => r.event_slug).filter(Boolean))] as string[];
  const { data: events } = await supabaseAdmin
    .from("fusion_events")
    .select("slug,title")
    .in("slug", eventSlugsSeen.length ? eventSlugsSeen : ["__none__"]);
  const eventTitleBySlug: Record<string, string> = {};
  for (const e of (events ?? []) as Array<{ slug: string; title?: string }>) {
    eventTitleBySlug[e.slug] = String(e.title || e.slug);
  }

  const escapeCsv = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  type CsvRow = {
    registered_at: string | null;
    gate_confirmed_at: string | null;
    reference: string;
    campaign: string;
    type: string;
    name: string;
    email: string;
    amount: number;
    currency: string;
    quantity: number;
  };
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" }) : "";
  const txCsvRows: CsvRow[] = txRows.map((t) => ({
    registered_at: null,
    gate_confirmed_at: t.checked_in_at,
    reference: t.reference,
    campaign: campaignTitleById[t.campaign_id] ?? t.campaign_id,
    type: t.campaign_type === "vote" ? "Vote" : "Ticket",
    name: (t.payer_name ?? "").trim() || "—",
    email: (t.email ?? "").trim() || "—",
    amount: t.amount,
    currency: String(t.currency ?? "").toUpperCase(),
    quantity: t.quantity ?? 0,
  }));
  const regCsvRows: CsvRow[] = regRows.map((a) => {
    const g = Math.max(0, Number(a.additional_guests) || 0);
    return {
      registered_at: a.created_at ?? null,
      gate_confirmed_at: a.checked_in_at,
      reference: a.reference,
      campaign: a.event_slug ? eventTitleBySlug[a.event_slug] ?? a.event_slug : "—",
      type: "Registration",
      name: (a.name ?? "").trim() || "—",
      email: (a.email ?? "").trim() || "—",
      amount: 0,
      currency: "",
      quantity: 1 + g,
    };
  });

  const sortTs = (r: CsvRow) => {
    const g = r.gate_confirmed_at ? new Date(r.gate_confirmed_at).getTime() : 0;
    const reg = r.registered_at ? new Date(r.registered_at).getTime() : 0;
    return Math.max(g, reg);
  };
  const allRows = [...txCsvRows, ...regCsvRows].sort((a, b) => sortTs(b) - sortTs(a));

  const headers = [
    "Registered time",
    "Gate confirmed",
    "Reference",
    "Event/Campaign",
    "Type",
    "Name",
    "Email",
    "Amount",
    "Currency",
    "Quantity",
  ];
  const lines = [
    headers.join(","),
    ...allRows.map((r) => [
      escapeCsv(fmt(r.registered_at)),
      escapeCsv(fmt(r.gate_confirmed_at)),
      escapeCsv(r.reference),
      escapeCsv(r.campaign),
      escapeCsv(r.type),
      escapeCsv(r.name),
      escapeCsv(r.email),
      escapeCsv(r.amount),
      escapeCsv(r.currency),
      escapeCsv(r.quantity),
    ].join(",")),
  ];

  const csv = lines.join("\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = eventSlug ? `gate-check-ins-${eventSlug}-${dateStr}.csv` : `gate-check-ins-${dateStr}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
