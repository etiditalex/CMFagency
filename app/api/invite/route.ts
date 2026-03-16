import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const ref = (url.searchParams.get("ref") ?? "").trim();
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id,reference,email,payer_name,metadata,status")
    .eq("reference", ref)
    .maybeSingle();

  if (error || !tx || (tx as { status?: string }).status !== "success") {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const meta = (typeof (tx as { metadata?: unknown }).metadata === "object" &&
    (tx as { metadata?: Record<string, unknown> }).metadata) || {};
  const slug = (meta.slug as string) || null;

  let eventTitle: string | null = null;
  let eventDate: string | null = null;
  let eventLocation: string | null = null;

  if (slug) {
    const { data: ev } = await supabase
      .from("fusion_events")
      .select("title,event_date,location,venue")
      .eq("ticket_campaign_slug", slug)
      .maybeSingle();
    if (ev) {
      eventTitle = (ev as { title?: string | null }).title ?? null;
      const ed = (ev as { event_date?: string | null }).event_date;
      eventDate = ed ? new Date(ed).toISOString() : null;
      const loc = (ev as { location?: string | null }).location;
      const venue = (ev as { venue?: string | null }).venue;
      eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || null;
    }
  }

  const { data: attendee } = await supabase
    .from("event_attendees")
    .select("name,email,phone,notes")
    .eq("reference", ref)
    .maybeSingle();

  return NextResponse.json({
    reference: (tx as { reference: string }).reference,
    defaultName:
      (attendee as { name?: string | null } | null)?.name ??
      (tx as { payer_name?: string | null }).payer_name ??
      ((tx as { email?: string | null }).email ?? null),
    defaultEmail:
      (attendee as { email?: string | null } | null)?.email ??
      ((tx as { email?: string | null }).email ?? null),
    defaultPhone: (attendee as { phone?: string | null } | null)?.phone ?? null,
    defaultNotes: (attendee as { notes?: string | null } | null)?.notes ?? null,
    eventTitle,
    eventDate,
    eventLocation,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { ref?: string; name?: string; email?: string; phone?: string; notes?: string }
    | null;
  const ref = body?.ref?.trim() ?? "";
  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id,reference,status")
    .eq("reference", ref)
    .maybeSingle();

  if (error || !tx || (tx as { status?: string }).status !== "success") {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const payload = {
    transaction_id: (tx as { id: string }).id,
    reference: (tx as { reference: string }).reference,
    name: body?.name?.trim() || null,
    email: body?.email?.trim() || null,
    phone: body?.phone?.trim() || null,
    notes: body?.notes?.trim() || null,
  };

  const { error: upsertErr } = await supabase
    .from("event_attendees")
    .upsert(payload, { onConflict: "transaction_id" });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

