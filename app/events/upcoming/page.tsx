"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, ArrowRight, Ticket } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Image from "next/image";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModalLazy";
import { resolveFusionModalTicketTier } from "@/lib/fusion-general-admission-tier";
import { supabase } from "@/lib/supabase";

const DEFAULT_HERO = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg";

type TicketTierRow = {
  id: string;
  label: string;
  slug: string;
  unit_amount_kes: number;
  inclusions?: string[];
  people_per_package?: number;
};

type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  time: string | null;
  description: string | null;
  image_url: string | null;
  default_image_url: string | null;
  ticket_campaign_slug: string | null;
  ticket_price_kes?: number | null;
  ticket_tiers?: TicketTierRow[] | null;
  image_focus?: string | null;
  free_registration?: boolean | null;
  lipa_pole_pole?: boolean | null;
};

// CFMA 2026: Always show in upcoming list (alongside events from Fusion Xpress dashboard)
const CFMA_2026_EVENT: EventRow = {
  id: "cfma-2026-default",
  slug: "coast-fashion-modelling-awards-2026",
  title: "Coast Fashion and Modelling Awards 2026 (CMFA)",
  event_date: "2026-08-15",
  end_date: null,
  location: "Mombasa, Kenya",
  time: "6:50 PM",
  description: "Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism.",
  image_url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
  default_image_url: null,
  ticket_campaign_slug: null,
  ticket_price_kes: null,
  ticket_tiers: null,
  image_focus: "center center",
  free_registration: false,
  lipa_pole_pole: true,
};

export default function UpcomingEventsPage() {
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [tieredEvent, setTieredEvent] = useState<EventRow | null>(null);
  const [buyLoadingEventId, setBuyLoadingEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    const load = async () => {
      const { data, error: queryError } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date,location,time,description,image_url,default_image_url,ticket_campaign_slug,ticket_price_kes,ticket_tiers,image_focus,free_registration,lipa_pole_pole")
        .eq("is_live", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true });
      if (!cancelled) {
        const dbEvents = (queryError ? [] : (data ?? [])) as EventRow[];
        const hasCfmaInDb = dbEvents.some((e) => e.slug === "coast-fashion-modelling-awards-2026");
        const merged = hasCfmaInDb
          ? dbEvents
          : [CFMA_2026_EVENT, ...dbEvents].sort((a, b) => a.event_date.localeCompare(b.event_date));
        setEvents(merged);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Gray page background shows above the grid (like listing sites); extra top padding clears the nav + adds breathing room before cards */}
      <section className="pt-28 pb-16 sm:pt-32 md:pt-40 md:pb-20">
        <div className="container-custom max-w-6xl">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-600 max-w-xl mx-auto space-y-3">
              <p className="text-lg font-medium text-gray-800">No upcoming dates are published yet.</p>
              <p className="text-sm leading-relaxed">
                New programmes are announced on this site and through our newsletter. Browse{" "}
                <Link href="/events/past" className="text-primary-600 font-semibold underline hover:text-primary-700">
                  past events
                </Link>{" "}
                for highlights, or ask about partnerships via{" "}
                <Link href="/contact" className="text-primary-600 font-semibold underline hover:text-primary-700">
                  Contact
                </Link>
                .
              </p>
            </div>
          ) : (
          <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {events.map((event, index) => {
              const eventDate = new Date(event.event_date);
              const imgUrl = event.image_url || event.default_image_url || DEFAULT_HERO;
              const objectPosition = (event.image_focus as string | null) || "center center";
              return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group"
              >
                <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
                  <Link href={`/events/upcoming/${event.slug}`} className="block flex-1">
                    <div className="relative aspect-[16/10] w-full bg-gray-100">
                      <Image
                        src={imgUrl}
                        alt={event.title}
                        fill
                        className="object-contain object-center"
                        style={{ objectPosition }}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="absolute left-3 top-3 z-10 rounded-lg bg-primary-600 px-4 py-3 shadow-lg">
                        <div className="text-lg font-bold leading-tight text-white">
                          {format(eventDate, "d")}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-white">
                          {format(eventDate, "MMM")}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="text-primary-600 font-semibold text-sm mb-2">
                        {format(eventDate, "MMM d, yyyy")}
                        {event.time ? ` · ${event.time}` : ""}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1">{event.location ?? "—"}</span>
                      </div>
                      {event.ticket_price_kes != null && Number(event.ticket_price_kes) > 0 && (
                        <div className="text-sm font-semibold text-gray-900 mb-2">
                          Entry: KES {Number(event.ticket_price_kes).toLocaleString("en-KE")}
                        </div>
                      )}
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {event.description ?? ""}
                      </p>
                      <span className="inline-flex items-center text-primary-600 font-semibold text-sm group-hover:text-primary-700">
                        View Event
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                  {(event.free_registration || event.ticket_campaign_slug || event.ticket_tiers?.length || event.slug === "coast-fashion-modelling-awards-2026") && (
                    <div className="px-5 pb-5">
                      {event.free_registration ? (
                        <Link
                          href={`/events/register/${event.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 text-sm transition-colors"
                        >
                          <Ticket className="w-4 h-4" />
                          Register
                        </Link>
                      ) : (event.ticket_tiers?.length ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTieredEvent(event);
                            setTicketModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-gray-900 hover:bg-black text-white font-semibold py-2.5 px-4 text-sm transition-colors"
                        >
                          <Ticket className="w-4 h-4" />
                          Buy Ticket Online
                        </button>
                      ) : event.slug === "coast-fashion-modelling-awards-2026" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTieredEvent(null);
                            setTicketModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-gray-900 hover:bg-black text-white font-semibold py-2.5 px-4 text-sm transition-colors"
                        >
                          <Ticket className="w-4 h-4" />
                          Buy Ticket Online
                        </button>
                      ) : event.ticket_campaign_slug?.trim() ? (
                        <button
                          type="button"
                          disabled={buyLoadingEventId === event.id}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBuyLoadingEventId(event.id);
                            try {
                              const slug = event.ticket_campaign_slug!.trim();
                              const tier = await resolveFusionModalTicketTier(slug, event.ticket_price_kes);
                              if (tier === "navigate") {
                                window.location.href = `/${slug}`;
                                return;
                              }
                              setTieredEvent({
                                ...event,
                                ticket_tiers: [
                                  {
                                    id: tier.id,
                                    label: tier.label,
                                    slug: tier.slug,
                                    unit_amount_kes: tier.unit_amount_kes,
                                  },
                                ],
                              });
                              setTicketModalOpen(true);
                            } finally {
                              setBuyLoadingEventId(null);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-gray-900 hover:bg-black disabled:opacity-70 text-white font-semibold py-2.5 px-4 text-sm transition-colors"
                        >
                          {buyLoadingEventId === event.id ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                          ) : (
                            <Ticket className="w-4 h-4 shrink-0" />
                          )}
                          {buyLoadingEventId === event.id ? "Opening checkout…" : "Buy Ticket Online"}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.div>
            );
            })}
          </div>
          )}
        </div>
      </section>

      <CmfAwardsTicketModal
        open={ticketModalOpen}
        onClose={() => { setTicketModalOpen(false); setTieredEvent(null); }}
        event={tieredEvent ? {
          title: tieredEvent.title,
          shortTitle: tieredEvent.title,
          date: tieredEvent.event_date ? format(new Date(tieredEvent.event_date), "do MMMM yyyy") : "",
          time: tieredEvent.time ?? undefined,
          location: tieredEvent.location ?? undefined,
          imageUrl: (tieredEvent.image_url || tieredEvent.default_image_url) ?? undefined,
        } : undefined}
        tiers={tieredEvent?.ticket_tiers ?? undefined}
      />
    </div>
  );
}
