import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { CMFA_EVENT_SLUG, isCmfaComplimentaryTicketTier } from "@/lib/cmfa-registration";
import { requireGateAccess } from "@/lib/require-gate-access";
import { sendEventInviteEmail } from "@/lib/send-event-invite-email";

export const runtime = "nodejs";

const REGISTRATION_SELECT =
  "id, reference, event_slug, name, email, phone, designation, status, is_guest, parent_registration_id, checked_in_at, approved_at, rejection_reason, created_at, ticket_tier";
const REGISTRATION_SELECT_LEGACY =
  "id, reference, event_slug, name, email, phone, designation, status, is_guest, parent_registration_id, checked_in_at, approved_at, rejection_reason, created_at";

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);

const CFMA_EVENT = {
  title: "Coast Fashion and Modelling Awards 2026 (CMFA)",
  event_date: "2026-08-15",
  time: "6:50 PM",
  location: "Mombasa, Kenya",
};

function buildCalendarUrl(title: string, eventDate: string, location: string): string {
  const d = eventDate.replace(/-/g, "");
  const startStr = `${d}T185000`;
  const endStr = `${d}T235900`;
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${startStr}/${endStr}` +
    `&location=${encodeURIComponent(location)}` +
    `&details=${encodeURIComponent("CMFA complimentary ticket – show QR at gate.")}`
  );
}

async function loadEventDetails(admin: SupabaseClient) {
  const { data } = await admin
    .from("fusion_events")
    .select("title, event_date, time, location, venue, map_url")
    .eq("slug", CMFA_EVENT_SLUG)
    .maybeSingle();

  if (data) {
    const row = data as {
      title?: string;
      event_date?: string;
      time?: string | null;
      location?: string | null;
      venue?: string | null;
      map_url?: string | null;
    };
    const loc = row.venue && row.location ? `${row.venue}, ${row.location}` : row.location || row.venue || CFMA_EVENT.location;
    return {
      title: row.title ?? CFMA_EVENT.title,
      eventDate: row.event_date ?? CFMA_EVENT.event_date,
      time: row.time ?? CFMA_EVENT.time,
      location: loc,
      mapUrl:
        row.map_url ||
        (loc ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}` : undefined),
    };
  }

  return {
    title: CFMA_EVENT.title,
    eventDate: CFMA_EVENT.event_date,
    time: CFMA_EVENT.time,
    location: CFMA_EVENT.location,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CFMA_EVENT.location)}`,
  };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;
  const { admin, userId } = auth;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing registration id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    rejection_reason?: string;
    ticket_tier?: string;
  };

  const nextStatus = String(body.status ?? "").trim();
  const rejectionReason = String(body.rejection_reason ?? "").trim() || null;
  const requestedTier = String(body.ticket_tier ?? "").trim().toLowerCase();

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data: beforeRow, error: beforeErr } = await admin
    .from("cmfa_registrations")
    .select("id, reference, name, email, status")
    .eq("id", id)
    .maybeSingle();

  if (beforeErr) return NextResponse.json({ error: beforeErr.message }, { status: 500 });
  if (!beforeRow) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

  const prevStatus = String((beforeRow as { status?: string }).status ?? "");
  const becameApproved = nextStatus === "approved" && prevStatus !== "approved";

  let ticketTier: string | null = null;
  if (becameApproved) {
    if (!isCmfaComplimentaryTicketTier(requestedTier)) {
      return NextResponse.json(
        { error: "Choose Complimentary Regular, VIP, or VVIP before approving." },
        { status: 400 }
      );
    }
    ticketTier = requestedTier;
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === "approved") {
    updatePayload.approved_at = new Date().toISOString();
    updatePayload.approved_by = userId;
    updatePayload.rejection_reason = null;
    if (ticketTier) updatePayload.ticket_tier = ticketTier;
  } else if (nextStatus === "rejected") {
    updatePayload.rejection_reason = rejectionReason;
    updatePayload.approved_at = null;
    updatePayload.approved_by = null;
    updatePayload.checked_in_at = null;
  } else if (nextStatus === "pending") {
    updatePayload.approved_at = null;
    updatePayload.approved_by = null;
    updatePayload.rejection_reason = null;
  }

  let { data, error } = await admin
    .from("cmfa_registrations")
    .update(updatePayload)
    .eq("id", id)
    .select(REGISTRATION_SELECT)
    .maybeSingle();

  if (error && /ticket_tier/i.test(error.message) && ticketTier) {
    const withoutTier = { ...updatePayload };
    delete withoutTier.ticket_tier;
    const retry = await admin
      .from("cmfa_registrations")
      .update(withoutTier)
      .eq("id", id)
      .select(REGISTRATION_SELECT_LEGACY)
      .maybeSingle();
    data = retry.data ? { ...retry.data, ticket_tier: ticketTier } : retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

  if (becameApproved) {
    const eventDetails = await loadEventDetails(admin);
    const eventDateFormatted = eventDetails.eventDate
      ? new Date(eventDetails.eventDate).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : undefined;

    const emailResult = await sendEventInviteEmail({
      to: String((data as { email?: string }).email ?? ""),
      eventTitle: eventDetails.title,
      holderName: String((data as { name?: string }).name ?? "Guest"),
      reference: String((data as { reference?: string }).reference ?? ""),
      eventDate: eventDateFormatted,
      eventTime: eventDetails.time ?? undefined,
      eventLocation: eventDetails.location,
      calendarUrl: buildCalendarUrl(eventDetails.title, eventDetails.eventDate, eventDetails.location),
      mapUrl: eventDetails.mapUrl,
      designation: String((data as { designation?: string }).designation ?? ""),
      ticketTier: ticketTier ?? undefined,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          registration: data,
          email_sent: false,
          email_error: emailResult.error ?? "Could not send complimentary ticket email.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ registration: data, email_sent: true });
  }

  return NextResponse.json({ registration: data, email_sent: false });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireGateAccess(_req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing registration id." }, { status: 400 });

  const { data: row, error: fetchErr } = await admin
    .from("cmfa_registrations")
    .select("id, name, email, is_guest, parent_registration_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Registration not found." }, { status: 404 });

  const { error: deleteErr } = await admin.from("cmfa_registrations").delete().eq("id", id);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deleted_id: id,
    name: (row as { name?: string }).name,
    email: (row as { email?: string }).email,
  });
}
