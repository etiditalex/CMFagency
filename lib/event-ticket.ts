import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeSlug } from "@/lib/ensure-campaign-from-event";
import {
  normalizePeoplePerPackage,
  normalizeTierFromDb,
  type FusionTicketTier,
} from "@/lib/fusion-event-ticket-tier";

const EVENT_SELECT =
  "slug, title, location, venue, event_date, time, image_url, default_image_url, gallery, hosted_by, ticket_campaign_slug, ticket_tiers, ticket_price_kes";

type FusionEventTicketRow = {
  slug?: string | null;
  title?: string | null;
  location?: string | null;
  venue?: string | null;
  event_date?: string | null;
  time?: string | null;
  image_url?: string | null;
  default_image_url?: string | null;
  gallery?: unknown;
  hosted_by?: string | null;
  ticket_campaign_slug?: string | null;
  ticket_tiers?: unknown;
  ticket_price_kes?: number | null;
};

function galleryFirstUrl(gallery: unknown): string | undefined {
  if (!Array.isArray(gallery) || gallery.length === 0) return undefined;
  const first = gallery[0];
  if (typeof first === "string" && first.trim()) return first.trim();
  if (first && typeof first === "object") {
    const rec = first as Record<string, unknown>;
    const url = rec.url ?? rec.image_url ?? rec.src;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return undefined;
}

export function pickEventPosterUrl(event: {
  image_url?: string | null;
  default_image_url?: string | null;
  gallery?: unknown;
}): string | undefined {
  return event.image_url?.trim() || event.default_image_url?.trim() || galleryFirstUrl(event.gallery) || undefined;
}

export type EventTicketPdfInput = {
  eventTitle: string;
  holderName: string;
  allows: number;
  ticketTypeLabel: string;
  ticketDay: string;
  ticketId: string;
  venue: string;
  posterUrl?: string;
  qrData: string;
  organizerName: string;
  eventTime?: string;
};

export function shortTicketId(reference: string): string {
  const cleaned = reference.replace(/^cmf[_-]/i, "").replace(/[^A-Za-z0-9]/g, "");
  return (cleaned.slice(-8) || "TICKET").toUpperCase();
}

export function ticketNumberFromReference(
  reference: string,
  slug: string,
  campaignType: string | null | undefined,
  isMerchandise: boolean
): string {
  const ticketSuffix = shortTicketId(reference);
  const prefix = String(slug || "EVENT")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8) || "EVENT";
  const typeCode = campaignType === "vote" ? "VOT" : isMerchandise ? "ORD" : "TKT";
  return `${prefix}-${typeCode}-${ticketSuffix}`;
}

export function ticketPdfFilename(ticketId: string): string {
  return `ticket_${ticketId}.pdf`;
}

/** TikoHUB-style date: Sat 22/08/2026 */
export function formatTicketDay(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const raw = isoDate.trim();
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00+03:00`);
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "Africa/Nairobi" });
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
  return `${weekday} ${date}`;
}

export function formatTicketTypeLabel(label: string, unitKes: number): string {
  const name = label.trim() || "Ticket";
  const amount = Number.isFinite(unitKes) ? Math.round(unitKes) : 0;
  return `${name} (Ksh. ${amount.toLocaleString("en-KE")})`;
}

function tiersOf(event: FusionEventTicketRow): FusionTicketTier[] {
  return Array.isArray(event.ticket_tiers)
    ? event.ticket_tiers.map((row) => normalizeTierFromDb(row as FusionTicketTier & Record<string, unknown>))
    : [];
}

function matchTier(event: FusionEventTicketRow, slugNorm: string): FusionTicketTier | null {
  const tiers = tiersOf(event);
  return tiers.find((t) => normalizeSlug(t.slug) === slugNorm) ?? null;
}

async function firstMatchingEvent(
  supabase: SupabaseClient,
  column: "ticket_campaign_slug" | "slug",
  value: string
): Promise<FusionEventTicketRow | null> {
  const { data } = await supabase.from("fusion_events").select(EVENT_SELECT).eq(column, value).limit(1);
  const row = Array.isArray(data) ? data[0] : data;
  return (row as FusionEventTicketRow | undefined) ?? null;
}

function eventMatchesSlug(event: FusionEventTicketRow, slugNorm: string): boolean {
  if (normalizeSlug(event.ticket_campaign_slug ?? "") === slugNorm) return true;
  if (normalizeSlug(event.slug ?? "") === slugNorm) return true;
  return matchTier(event, slugNorm) != null;
}

async function loadEventForCampaignSlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ event: FusionEventTicketRow; tier: FusionTicketTier | null } | null> {
  const slugNorm = normalizeSlug(slug);
  if (!slugNorm) return null;

  const indexed =
    (await firstMatchingEvent(supabase, "ticket_campaign_slug", slug)) ||
    (slugNorm !== slug ? await firstMatchingEvent(supabase, "ticket_campaign_slug", slugNorm) : null) ||
    (await firstMatchingEvent(supabase, "slug", slugNorm)) ||
    (slug !== slugNorm ? await firstMatchingEvent(supabase, "slug", slug) : null);

  if (indexed) {
    return { event: indexed, tier: matchTier(indexed, slugNorm) };
  }

  const { data: rows } = await supabase.from("fusion_events").select(EVENT_SELECT);
  for (const row of (rows ?? []) as FusionEventTicketRow[]) {
    if (eventMatchesSlug(row, slugNorm)) {
      return { event: row, tier: matchTier(row, slugNorm) };
    }
  }

  return null;
}

/** Snapshot the dashboard event poster + details onto the checkout transaction. */
export async function eventPosterMetaForSlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Record<string, string | number>> {
  const matched = await loadEventForCampaignSlug(supabase, slug);
  if (!matched) return {};
  const { event, tier } = matched;
  const poster = pickEventPosterUrl(event);
  const meta: Record<string, string | number> = {};
  const title = event.title?.trim();
  if (title) meta.event_title = title;
  if (poster && !poster.startsWith("data:") && poster.length < 2000) meta.event_poster_url = poster;
  const venue = event.venue?.trim() || event.location?.trim();
  if (venue) meta.event_venue = venue;
  const day = formatTicketDay(event.event_date);
  if (day) meta.event_date = day;
  if (event.time?.trim()) meta.event_time = event.time.trim();
  if (event.hosted_by?.trim()) meta.event_hosted_by = event.hosted_by.trim();
  if (tier?.label?.trim()) meta.event_ticket_label = tier.label.trim();
  const people = normalizePeoplePerPackage(tier?.people_per_package);
  if (people > 1) meta.event_people_per_package = people;
  return meta;
}

export async function loadEventTicketPdfInput(
  supabase: SupabaseClient,
  args: {
    slug: string;
    campaignTitle: string;
    holderName: string;
    reference: string;
    ticketNumber: string;
    amountKes: number;
    quantity: number;
    meta?: Record<string, unknown>;
  }
): Promise<EventTicketPdfInput> {
  const quantity = Math.max(1, Math.trunc(Number(args.quantity) || 1));
  const unitFromTx = quantity > 0 ? Math.round(Number(args.amountKes || 0) / quantity) : Math.round(Number(args.amountKes || 0));
  const ticketId = shortTicketId(args.reference);
  const meta = args.meta ?? {};
  const matched = args.slug && args.slug !== "event" ? await loadEventForCampaignSlug(supabase, args.slug) : null;
  const event = matched?.event;
  const tier = matched?.tier;

  let campaignPoster: string | undefined;
  if (!pickEventPosterUrl(event ?? {}) && args.slug && args.slug !== "event") {
    const { data: camp } = await supabase.from("campaigns").select("image_url").eq("slug", args.slug).maybeSingle();
    campaignPoster = (camp as { image_url?: string | null } | null)?.image_url?.trim() || undefined;
  }

  const label = (
    tier?.label ||
    (typeof meta.event_ticket_label === "string" ? meta.event_ticket_label : "") ||
    args.campaignTitle ||
    "Ticket"
  ).trim();
  const unitKes = tier?.unit_amount_kes && tier.unit_amount_kes > 0 ? tier.unit_amount_kes : unitFromTx;
  const people = normalizePeoplePerPackage(
    tier?.people_per_package ?? (typeof meta.event_people_per_package === "number" ? meta.event_people_per_package : 1)
  );
  const venue =
    event?.venue?.trim() ||
    event?.location?.trim() ||
    (typeof meta.event_venue === "string" ? meta.event_venue.trim() : "") ||
    "Venue to be confirmed";
  const posterUrl =
    pickEventPosterUrl(event ?? {}) ||
    (typeof meta.event_poster_url === "string" ? meta.event_poster_url.trim() : "") ||
    campaignPoster ||
    undefined;
  const ticketDay = formatTicketDay(event?.event_date) || (typeof meta.event_date === "string" ? meta.event_date : "") || "";

  return {
    eventTitle: (
      event?.title ||
      (typeof meta.event_title === "string" ? meta.event_title : "") ||
      args.campaignTitle ||
      "Event"
    ).trim(),
    holderName: args.holderName.trim() || "Guest",
    allows: people * quantity,
    ticketTypeLabel: formatTicketTypeLabel(label, unitKes),
    ticketDay,
    ticketId,
    venue,
    posterUrl: posterUrl || undefined,
    qrData: `${args.ticketNumber}\n${args.reference}`,
    organizerName:
      event?.hosted_by?.trim() ||
      (typeof meta.event_hosted_by === "string" ? meta.event_hosted_by.trim() : "") ||
      "Changer Fusions",
    eventTime: event?.time?.trim() || (typeof meta.event_time === "string" ? meta.event_time.trim() : undefined) || undefined,
  };
}

export function eventDetailsFromTicket(ticket: EventTicketPdfInput): {
  eventLocation?: string;
  eventDate?: string;
  eventTime?: string;
} {
  return {
    eventLocation: ticket.venue && ticket.venue !== "Venue to be confirmed" ? ticket.venue : undefined,
    eventDate: ticket.ticketDay || undefined,
    eventTime: ticket.eventTime,
  };
}
