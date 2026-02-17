"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  time: string | null;
  venue: string | null;
  description: string | null;
  image_url: string | null;
  default_image_url: string | null;
};

const DEFAULT_IMG = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg";

export default function PastEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    const load = async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date,location,time,venue,description,image_url,default_image_url")
        .lt("event_date", today)
        .order("event_date", { ascending: false });
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
      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden flex items-center">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            src="https://www.youtube.com/embed/GpbNlgVikiE?autoplay=1&mute=1&loop=1&playlist=GpbNlgVikiE&controls=0&rel=0&modestbranding=1&playsinline=1"
            title="Past Events Background Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full"
            style={{ 
              border: "none",
              pointerEvents: "none"
            }}
          />
          {/* Dark overlay for better text readability */}
          <div className="absolute inset-0 bg-black/60"></div>
        </div>
        
        {/* Content */}
        <div className="container-custom relative z-10 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Past Events
            </h1>
            <p className="text-lg text-white/90">
              Relive the memorable moments from our past events. Explore event details, galleries, and share your feedback.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Events List */}
      <section className="section-padding bg-white py-16">
        <div className="container-custom max-w-6xl">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-lg">No past events to display.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => {
              const eventDate = new Date(event.event_date);
              const imgUrl = event.image_url || event.default_image_url || DEFAULT_IMG;
              const locationStr = event.venue && event.location ? `${event.venue}, ${event.location}` : event.location || event.venue || "—";
              return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group"
              >
                <Link href={`/events/past/${event.slug}`} className="block h-full">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
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
                    <div className="p-5 flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <div className="text-primary-600 font-semibold text-sm mb-2">
                        {format(eventDate, "MMM d, yyyy")}
                        {event.time ? ` · ${event.time}` : ""}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 text-sm mb-3">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="line-clamp-1">{locationStr}</span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {event.description ?? ""}
                      </p>
                    </div>
                    <div className="px-5 pb-5">
                      <span className="inline-flex items-center text-primary-600 font-semibold text-sm group-hover:text-primary-700">
                        View Details
                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                      </span>
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
    </div>
  );
}

