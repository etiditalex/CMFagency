"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MapPin, Search, Ticket, Lightbulb, Rocket, Briefcase, BookOpen, Users, Target, TrendingUp, Sparkles } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const events = [
  {
    id: 11,
    title: "Marketing Campaign Launch",
    date: new Date(2024, 11, 5),
    location: "Nairobi, Kenya",
    time: "2:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Launch event for major marketing campaigns, featuring guest speakers, strategy presentations, and networking opportunities.",
    status: "upcoming",
    category: "Marketing & Promotional",
  },
  // Corporate Partnership Events
  {
    id: 12,
    title: "Corporate Sponsorship Launch",
    date: new Date(2024, 8, 20),
    location: "Nairobi, Kenya",
    time: "10:00 AM - 2:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    description: "Official launch event for corporate sponsorship partnerships, featuring stakeholder presentations and partnership announcements.",
    status: "past",
    category: "Corporate Partnership",
  },
  {
    id: 13,
    title: "Joint Promotional Launch",
    date: new Date(2024, 10, 22),
    location: "Nairobi, Kenya",
    time: "11:00 AM - 3:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Collaborative promotional event showcasing joint initiatives between corporate partners and Changer Fusions.",
    status: "upcoming",
    category: "Corporate Partnership",
  },
  {
    id: 14,
    title: "Stakeholder Engagement Forum",
    date: new Date(2024, 9, 18),
    location: "Nairobi, Kenya",
    time: "9:00 AM - 1:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    description: "Strategic forum bringing together key stakeholders to discuss partnerships, collaborations, and future initiatives.",
    status: "past",
    category: "Corporate Partnership",
  },
  // Educational & Leadership Events
  {
    id: 15,
    title: "Leadership Development Seminar",
    date: new Date(2024, 10, 8),
    location: "University Campus",
    time: "9:00 AM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Comprehensive seminar focused on developing leadership skills, strategic thinking, and professional growth for students and young professionals.",
    status: "upcoming",
    category: "Educational & Leadership",
  },
  {
    id: 16,
    title: "Professional Development Panel Discussion",
    date: new Date(2024, 8, 25),
    location: "University Campus",
    time: "2:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Interactive panel discussion featuring industry experts sharing insights on career development and professional growth strategies.",
    status: "past",
    category: "Educational & Leadership",
  },
  {
    id: 17,
    title: "Skill-Building Workshop Series",
    date: new Date(2024, 11, 10),
    location: "University Campus",
    time: "10:00 AM - 3:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Hands-on workshop series covering essential skills for career success, including communication, problem-solving, and digital literacy.",
    status: "upcoming",
    category: "Educational & Leadership",
  },
  {
    id: 18,
    title: "Student Leadership Forum",
    date: new Date(2024, 9, 5),
    location: "University Campus",
    time: "1:00 PM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    description: "Forum for student leaders to discuss challenges, share experiences, and develop strategies for effective leadership in academic and community settings.",
    status: "past",
    category: "Educational & Leadership",
  },
  // Student Engagement Events
  {
    id: 19,
    title: "Campus Town Hall Meeting",
    date: new Date(2024, 10, 12),
    location: "University Campus",
    time: "3:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Open town hall meeting providing students with a platform to voice concerns, share ideas, and engage with campus leadership.",
    status: "upcoming",
    category: "Student Engagement",
  },
  {
    id: 20,
    title: "Student Feedback Forum",
    date: new Date(2024, 8, 15),
    location: "University Campus",
    time: "2:00 PM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Interactive forum designed to gather student feedback on campus services, programs, and initiatives to improve student experience.",
    status: "past",
    category: "Student Engagement",
  },
  {
    id: 21,
    title: "Student Engagement Drive",
    date: new Date(2024, 11, 15),
    location: "University Campus",
    time: "10:00 AM - 2:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    description: "Campus-wide engagement drive encouraging student participation in activities, clubs, and campus initiatives to foster a vibrant campus community.",
    status: "upcoming",
    category: "Student Engagement",
  },
];

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

function EventsPageContent() {
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">(
    (urlFilter === "upcoming" || urlFilter === "past") ? urlFilter : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  useEffect(() => {
    if (urlFilter === "upcoming" || urlFilter === "past") {
      setFilter(urlFilter);
    } else {
      setFilter("all");
    }
  }, [urlFilter]);

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
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase());
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredEvents.map((event, index) => {
              const EventIcon = getEventIcon(event.category);
              const iconGradient = getIconGradient(index);
              
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 group text-center md:text-center lg:text-left"
                >
                  <Link href={`/events/${event.id}`} className="block p-6">
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
                      {event.description}
                    </p>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {filteredEvents.length === 0 && (
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
