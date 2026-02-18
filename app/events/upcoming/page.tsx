"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Ticket } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Image from "next/image";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModal";
import { supabase } from "@/lib/supabase";

const DEFAULT_HERO = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg";

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
  ticket_campaign_slug: null, // Uses CmfAwardsTicketModal
};

export default function UpcomingEventsPage() {
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    const load = async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date,location,time,description,image_url,default_image_url,ticket_campaign_slug")
        .gte("event_date", today)
        .order("event_date", { ascending: true });
      if (!cancelled) {
        const dbEvents = (data ?? []) as EventRow[];
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
      {/* Hero Section - matching past events style */}
      <section className="relative w-full min-h-[60vh] md:min-h-[70vh] overflow-hidden flex items-center py-20 md:py-24">
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={events[0]?.image_url || events[0]?.default_image_url || DEFAULT_HERO}
            alt="Upcoming Events"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="container-custom relative z-10 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Upcoming Events
            </h1>
            <p className="text-lg text-white/90">
              Discover our upcoming events. View details, get tickets, and be part
              of the excitement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Events List - horizontal card format matching past events */}
      <section className="section-padding bg-white py-16">
        <div className="container-custom max-w-6xl">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-lg">No upcoming events at the moment.</p>
              <p className="mt-2 text-sm">Check back soon or explore our past events.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => {
              const eventDate = new Date(event.event_date);
              const imgUrl = event.image_url || event.default_image_url || DEFAULT_HERO;
              return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group"
              >
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <Link href={`/events/upcoming/${event.slug}`} className="block flex-1">
                    <div className="relative w-full aspect-[16/10]">
                      <Image
                        src={imgUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-primary-600 rounded-lg px-4 py-3 shadow-lg">
                        <div className="text-white font-bold text-lg leading-tight">{format(eventDate, "dd")}</div>
                        <div className="text-white font-semibold text-xs uppercase tracking-wide">{format(eventDate, "MMM")}</div>
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
                      <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                        {event.description ?? ""}
                      </p>
                      <span className="inline-flex items-center text-primary-600 font-semibold text-sm group-hover:text-primary-700">
                        View Event
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                  {(event.ticket_campaign_slug || event.slug === "coast-fashion-modelling-awards-2026") && (
                    <div className="px-5 pb-5">
                      <Link
                        href={
                          event.slug === "coast-fashion-modelling-awards-2026"
                            ? `/events/upcoming/${event.slug}`
                            : `/${event.ticket_campaign_slug}`
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-gray-900 hover:bg-black text-white font-semibold py-2.5 px-4 text-sm transition-colors"
                      >
                        <Ticket className="w-4 h-4" />
                        Buy Ticket Online
                      </Link>
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

      <CmfAwardsTicketModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} />
    </div>
  );
}
