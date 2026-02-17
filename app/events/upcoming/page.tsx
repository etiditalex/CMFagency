"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight, Ticket, Phone, Mail } from "lucide-react";
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
        if (!error) setEvents((data ?? []) as EventRow[]);
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
          <div className="space-y-8">
            {events.map((event, index) => {
              const eventDate = new Date(event.event_date);
              const imgUrl = event.image_url || event.default_image_url || DEFAULT_HERO;
              return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Link href={`/events/upcoming/${event.slug}`} className="block">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col md:flex-row">
                      {/* Image Section - Left Side */}
                      <div className="relative w-full md:w-80 lg:w-96 h-64 md:h-64 flex-shrink-0">
                        <Image
                          src={imgUrl}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                        {/* Date Box - Primary Color */}
                        <div className="absolute top-4 left-4 bg-primary-600 rounded-lg px-5 py-4 shadow-lg">
                          <div className="text-white font-bold text-xl leading-tight">
                            {format(eventDate, "dd")}
                          </div>
                          <div className="text-white font-semibold text-xs uppercase tracking-wide mt-1">
                            {format(eventDate, "MMM")}
                          </div>
                        </div>
                      </div>

                      {/* Content Section - Right Side */}
                      <div className="flex-1 p-6 md:p-8">
                        {/* Title */}
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
                          {event.title}
                        </h3>

                        {/* Date & Time - Primary Color */}
                        <div className="text-primary-600 font-semibold mb-3 text-base">
                          {format(eventDate, "MMM d, yyyy")}
                          {event.time ? ` · ${event.time}` : ""}
                        </div>

                        {/* Location - Dark Gray */}
                        <div className="text-gray-700 mb-4">
                          {event.location ?? "—"}
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 mb-6 line-clamp-2">
                          {event.description ?? ""}
                        </p>

                        {/* Icons Row */}
                        <div className="flex flex-wrap gap-4 md:gap-6 text-sm mt-4">
                          <div className="flex items-center text-gray-700">
                            <MapPin className="w-4 h-4 mr-2 text-secondary-600 flex-shrink-0" />
                            <span className="uppercase font-medium">{event.location ?? "—"}</span>
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-4 h-4 mr-2 text-secondary-600 flex-shrink-0" />
                            <span className="font-medium uppercase">{format(eventDate, "MMMM d")}</span>
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Phone className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" />
                            <span className="font-medium">CALL US +254 797 777347</span>
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Mail className="w-4 h-4 mr-2 text-primary-600 flex-shrink-0" />
                            <span className="font-medium">info@cmfagency.co.ke</span>
                          </div>
                        </div>

                        {/* View Event & Buy Ticket buttons */}
                        <div className="mt-6 flex flex-wrap gap-3">
                          <span className="inline-flex items-center text-primary-600 font-semibold text-sm group-hover:text-primary-700">
                            View Event
                            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                          </span>
                          {event.ticket_campaign_slug && (
                            <Link
                              href={`/${event.ticket_campaign_slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold py-2.5 px-4 text-sm transition-colors"
                            >
                              <Ticket className="w-4 h-4" />
                              Buy Ticket Online
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
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
