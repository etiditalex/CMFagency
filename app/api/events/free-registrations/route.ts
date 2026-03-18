import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * List free registrations for an event (organizer only). Used by Fusion Xpress event edit.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("event_id")?.trim() ?? "";
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: pm } = await admin.from("portal_members").select("user_id, role, features").eq("user_id", user.id).maybeSingle();
  const { data: au } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const pmRow = pm as { role?: string; features?: string[] } | null;
  const hasEventsAccess =
    !!au ||
    pmRow?.role === "admin" ||
    pmRow?.role === "manager" ||
    (Array.isArray(pmRow?.features) && pmRow.features.includes("events"));
  if (!pm && !au) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasEventsAccess) {
    return NextResponse.json({ error: "Events feature required" }, { status: 403 });
  }
  const isFullAdmin = !!au || pmRow?.role === "admin";

  const { data: ev, error: evErr } = await admin
    .from("fusion_events")
    .select("id, created_by, free_registration")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const row = ev as { id: string; created_by?: string | null; free_registration?: boolean | null };
  if (!row.free_registration) {
    return NextResponse.json({ error: "Not a free-registration event" }, { status: 400 });
  }
  if (!isFullAdmin && String(row.created_by ?? "") !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rows, error: listErr } = await admin
    .from("event_attendees")
    .select("id, name, email, phone, notes, additional_guests, created_at, checked_in_at, reference")
    .eq("event_id", eventId)
    .is("transaction_id", null)
    .order("created_at", { ascending: false });

  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  type Att = {
    additional_guests?: number | null;
  };
  const list = (rows ?? []) as Att[];
  let totalHeadcount = 0;
  for (const r of list) {
    const g = Math.max(0, Number(r.additional_guests) || 0);
    totalHeadcount += 1 + g;
  }

  return NextResponse.json({
    registrations: rows ?? [],
    count: list.length,
    totalHeadcount,
  });
}
