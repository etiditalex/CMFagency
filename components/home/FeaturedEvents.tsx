"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight, Rocket, Briefcase, BookOpen, Users, Sparkles } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

// Icon mapping for event categories
const getEventIcon = (category: string) => {
  const iconMap: { [key: string]: any } = {
    "Corporate Events": Briefcase,
    "Marketing & Brand Events": Rocket,
    "Training, Workshops & Masterclasses": BookOpen,
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

// Featured events representing our event categories
const featuredEvents = [
  {
    id: 12,
    title: "Corporate Sponsorship Launch",
    date: new Date(2024, 8, 20),
    location: "Nairobi, Kenya",
    time: "10:00 AM - 2:00 PM",
    description: "Official launch event for corporate sponsorship partnerships, featuring stakeholder presentations and partnership announcements.",
    category: "Corporate Events",
  },
  {
    id: 11,
    title: "Marketing Campaign Launch",
    date: new Date(2024, 11, 5),
    location: "Nairobi, Kenya",
    time: "2:00 PM - 5:00 PM",
    description: "Launch event for major marketing campaigns, featuring guest speakers, strategy presentations, and networking opportunities.",
    category: "Marketing & Brand Events",
  },
  {
    id: 15,
    title: "Leadership Development Seminar",
    date: new Date(2024, 10, 8),
    location: "University Campus",
    time: "9:00 AM - 4:00 PM",
    description: "Comprehensive seminar focused on developing leadership skills, strategic thinking, and professional growth.",
    category: "Training, Workshops & Masterclasses",
  },
  {
    id: 13,
    title: "Joint Promotional Launch",
    date: new Date(2024, 10, 22),
    location: "Nairobi, Kenya",
    time: "11:00 AM - 3:00 PM",
    description: "Collaborative promotional event showcasing joint initiatives between corporate partners and Changer Fusions.",
    category: "Corporate Events",
  },
];

export default function FeaturedEvents() {
  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Featured Events
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover our events and join our community of professionals
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredEvents.map((event, index) => {
            const EventIcon = getEventIcon(event.category);
            const iconGradient = getIconGradient(index);
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
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

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link href="/events" className="btn-primary inline-flex items-center">
            View All Events
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
