"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MapPin, Search, Rocket, Briefcase, BookOpen, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  location: string | null;
  time: string | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
};

const DEFAULT_IMG = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg";

// Icon mapping for event categories
const getEventIcon = (category: string) => {
  const iconMap: { [key: string]: any } = {
    "Marketing & Promotional": Rocket,
    "Corporate Partnership": Briefcase,
    "Educational & Leadership": BookOpen,
    "Student Engagement": Users,
    "Fashion & Modelling": Sparkles,
  };
  return iconMap[category] || Calendar;
};

// Gradient colors for icon backgrounds - using website color palette
const getIconGradient = (index: number) => {
  const gradients = [
    "from-primary-500 to-primary-600",
    "from-secondary-400 via-secondary-500 to-primary-500",
    "from-primary-500 to-primary-600",
    "from-secondary-400 via-secondary-500 to-primary-500",
  ];
  return gradients[index % gradients.length];
};

type DisplayEvent = EventRow & { status: "upcoming" | "past" };

function EventsPageContent() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams?.get("filter");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">(
    (urlFilter === "upcoming" || urlFilter === "past") ? urlFilter : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (urlFilter === "upcoming" || urlFilter === "past") {
      setFilter(urlFilter);
    } else {
      setFilter("all");
    }
  }, [urlFilter]);

  useEffect(() => {
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    const load = async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,location,time,description,image_url,category")
        .order("event_date", { ascending: false });
      if (!cancelled) {
        if (!error && data) {
          const display: DisplayEvent[] = (data as EventRow[]).map((e) => ({
            ...e,
            status: e.event_date >= today ? "upcoming" : "past",
          }));
          setEvents(display);
        }
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const categories = [
    "All",
    "Fashion & Modelling",
    "Marketing & Promotional",
    "Corporate Partnership",
    "Educational & Leadership",
    "Student Engagement",
  ];

  const filteredEvents = events.filter((event) => {
    const matchesFilter = filter === "all" || event.status === filter;
    const desc = event.description ?? "";
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || event.category === categoryFilter;
    return matchesFilter && matchesSearch && matchesCategory;
  });

  return (
    <div className="pt-20 min-h-screen bg-white">
      {/* Our Events Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Our Events
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our organized events across different categories
            </p>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", "upcoming", "past"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setFilter(option)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 capitalize ${
                      filter === option
                        ? "bg-primary-600 text-white shadow-lg"
                        : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 text-sm ${
                    categoryFilter === category
                      ? "bg-secondary-600 text-white shadow-lg"
                      : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Events Grid - Card Design */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredEvents.map((event, index) => {
              const EventIcon = getEventIcon(event.category ?? "");
              const iconGradient = getIconGradient(index);
              const detailPath = event.status === "upcoming" ? `/events/upcoming/${event.slug}` : `/events/past/${event.slug}`;
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 group text-center md:text-center lg:text-left"
                >
                  <Link href={detailPath} className="block p-6">
                    {/* Icon Container */}
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${iconGradient} flex items-center justify-center mb-4 mx-auto md:mx-auto lg:mx-0`}>
                      <EventIcon className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-lg font-bold mb-3 text-gray-900 group-hover:text-primary-600 transition-colors">
                      {event.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {event.description ?? ""}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          )}

          {!loading && filteredEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              {filter === "upcoming" ? (
                <div className="space-y-6">
                  <motion.h2
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="text-5xl md:text-7xl font-bold"
                  >
                    <motion.span
                      animate={{
                        backgroundPosition: ["0%", "100%", "0%"],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-clip-text text-transparent"
                      style={{
                        backgroundSize: "200% auto",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        display: "inline-block",
                      }}
                    >
                      Coming Soon
                    </motion.span>
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto"
                  >
                    We're working on exciting upcoming events. Stay tuned for updates!
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex justify-center mt-8"
                  >
                    <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  </motion.div>
                </div>
              ) : (
                <p className="text-gray-600 text-lg">No events found matching your criteria.</p>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="pt-20 min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    }>
      <EventsPageContent />
    </Suspense>
  );
}
