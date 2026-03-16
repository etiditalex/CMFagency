import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendEventInviteEmail } from "@/lib/send-event-invite-email";

export const runtime = "nodejs";

function generateRef(slug: string): string {
  const part = randomBytes(4).toString("hex");
  return `reg_${slug}_${part}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
  } | null;
  const slug = (body?.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim();
  const phone = (body?.phone ?? "").trim() || null;
  const notes = (body?.notes ?? "").trim() || null;

  if (!slug || !name || !email) {
    return NextResponse.json(
      { error: "Slug, name and email are required" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server config missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const today = new Date().toISOString().slice(0, 10);
  const { data: event, error: eventErr } = await supabase
    .from("fusion_events")
    .select("id, slug, title, event_date, time, location, venue")
    .eq("slug", slug)
    .eq("free_registration", true)
    .gte("event_date", today)
    .maybeSingle();

  if (eventErr || !event) {
    return NextResponse.json(
      { error: "Event not found or not open for free registration" },
      { status: 404 }
    );
  }

  const eventId = (event as { id: string }).id;
  const eventSlug = (event as { slug: string }).slug;
  const eventTitle = (event as { title: string }).title;
  const eventDate = (event as { event_date: string }).event_date;
  const eventTime = (event as { time?: string | null }).time;
  const loc = (event as { location?: string | null }).location;
  const venue = (event as { venue?: string | null }).venue;
  const eventLocation = venue && loc ? `${venue}, ${loc}` : loc || venue || undefined;
  const eventDateFormatted = eventDate
    ? new Date(eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : undefined;

  const reference = generateRef(eventSlug);

  const { error: insertErr } = await supabase.from("event_attendees").insert({
    transaction_id: null,
    reference,
    event_id: eventId,
    event_slug: eventSlug,
    name,
    email,
    phone,
    notes,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const result = await sendEventInviteEmail({
    to: email,
    eventTitle,
    holderName: name,
    reference,
    eventDate: eventDateFormatted,
    eventTime: eventTime ?? undefined,
    eventLocation,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Invite email could not be sent", reference },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, reference });
}
