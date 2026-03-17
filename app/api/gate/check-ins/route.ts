import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Returns check-in records (transactions with checked_in_at set) as JSON for the Gate check-ins list.
 * Same auth as Gate: portal member with reports. RLS limits to user's campaigns.
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
    .limit(1000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const txRows = (rows ?? []) as Array<{
    reference: string;
    checked_in_at: string | null;
    payer_name?: string | null;
    email?: string | null;
    amount: number;
    currency?: string | null;
    quantity?: number | null;
    campaign_type?: string | null;
    campaign_id: string;
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

  const txCheckIns = txRows.map((t) => ({
    checked_in_at: t.checked_in_at,
    reference: t.reference,
    campaign: campaignTitleById[t.campaign_id] ?? t.campaign_id,
    event_slug: null as string | null,
    type: t.campaign_type === "vote" ? "Vote" : "Ticket",
    payer_name: (t.payer_name ?? "").trim() || "—",
    email: (t.email ?? "").trim() || "—",
    amount: t.amount,
    currency: String(t.currency ?? "").toUpperCase(),
    quantity: t.quantity ?? 0,
  }));

  let attendeeQuery = supabaseAdmin
    .from("event_attendees")
    .select("reference,checked_in_at,name,email,event_slug")
    .not("checked_in_at", "is", null)
    .is("transaction_id", null)
    .order("checked_in_at", { ascending: false })
    .limit(1000);
  if (eventSlug) attendeeQuery = attendeeQuery.eq("event_slug", eventSlug);
  const { data: attendeeRows, error: attendeeErr } = await attendeeQuery;
  if (attendeeErr) return NextResponse.json({ error: attendeeErr.message }, { status: 500 });

  const regRows = (attendeeRows ?? []) as Array<{
    reference: string;
    checked_in_at: string | null;
    name?: string | null;
    email?: string | null;
    event_slug?: string | null;
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

  const regCheckIns = regRows.map((a) => ({
    checked_in_at: a.checked_in_at,
    reference: a.reference,
    campaign: a.event_slug ? eventTitleBySlug[a.event_slug] ?? a.event_slug : "—",
    event_slug: a.event_slug ?? null,
    type: "Registration",
    payer_name: (a.name ?? "").trim() || "—",
    email: (a.email ?? "").trim() || "—",
    amount: 0,
    currency: "",
    quantity: 0,
  }));

  let combined: Array<{
    checked_in_at: string | null;
    reference: string;
    campaign: string;
    event_slug: string | null;
    type: string;
    payer_name: string;
    email: string;
    amount: number;
    currency: string;
    quantity: number;
  }>;
  if (eventSlug) {
    const fe = await supabaseAdmin.from("fusion_events").select("ticket_campaign_slug").eq("slug", eventSlug).maybeSingle();
    const ev = fe.data as { ticket_campaign_slug?: string | null } | null;
    const campaignSlug = ev?.ticket_campaign_slug;
    const campRow = (campaigns ?? []).find((c: { slug?: string }) => c.slug === campaignSlug) as { id: string } | undefined;
    const campId = campRow?.id ?? null;
    const txForEvent = campId ? txRows.filter((t) => t.campaign_id === campId) : [];
    const txCheckInsForEvent = txForEvent.map((t) => ({
      checked_in_at: t.checked_in_at,
      reference: t.reference,
      campaign: campaignTitleById[t.campaign_id] ?? t.campaign_id,
      event_slug: null as string | null,
      type: t.campaign_type === "vote" ? "Vote" : "Ticket",
      payer_name: (t.payer_name ?? "").trim() || "—",
      email: (t.email ?? "").trim() || "—",
      amount: t.amount,
      currency: String(t.currency ?? "").toUpperCase(),
      quantity: t.quantity ?? 0,
    }));
    combined = [...txCheckInsForEvent, ...regCheckIns];
  } else {
    combined = [...txCheckIns, ...regCheckIns];
  }
  combined.sort((a, b) => {
    const ta = a.checked_in_at ? new Date(a.checked_in_at).getTime() : 0;
    const tb = b.checked_in_at ? new Date(b.checked_in_at).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json({ check_ins: combined.slice(0, 1000) });
}
