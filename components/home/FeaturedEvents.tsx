"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

// Real events from the events page
const featuredEvents = [
  {
    id: 1,
    title: "Changer Fusions Enterprise Gala Awards 2025",
    date: new Date(2025, 10, 24),
    location: "Kenya School of Government (Main)",
    time: "09:00 AM - 09:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "An immersive journey where young leaders and creatives design powerful sustainable fashion pieces while gaining skills in leadership, climate advocacy, and innovation.",
  },
  {
    id: 6,
    title: "Mr and Miss Culture Subaland",
    date: new Date(2024, 10, 5),
    location: "Subaland Region",
    time: "4:00 PM - 8:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
    description: "Cultural pageant celebrating the rich heritage and traditions of the Subaland region through fashion, talent, and cultural presentations.",
  },
  {
    id: 8,
    title: "Marketing Society Networking Mixer",
    date: new Date(2024, 10, 15),
    location: "Nairobi, Kenya",
    time: "6:00 PM - 9:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "Networking event for marketing professionals to connect, share insights, and build meaningful business relationships.",
  },
  {
    id: 15,
    title: "Leadership Development Seminar",
    date: new Date(2024, 10, 8),
    location: "University Campus",
    time: "9:00 AM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    description: "Comprehensive seminar focused on developing leadership skills, strategic thinking, and professional growth for students and young professionals.",
  },
  {
    id: 11,
    title: "Marketing Campaign Launch",
    date: new Date(2024, 11, 5),
    location: "Nairobi, Kenya",
    time: "2:00 PM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Launch event for major marketing campaigns, featuring guest speakers, strategy presentations, and networking opportunities.",
  },
  {
    id: 13,
    title: "Joint Promotional Launch",
    date: new Date(2024, 10, 22),
    location: "Nairobi, Kenya",
    time: "11:00 AM - 3:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Collaborative promotional event showcasing joint initiatives between corporate partners and Changer Fusions Enterprise.",
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
            Discover upcoming events and join our community of professionals
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300 group"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {format(event.date, "MMM d")}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-gray-900">{event.title}</h3>
                <p className="text-gray-600 mb-4 text-sm">{event.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-primary-600" />
                    {format(event.date, "EEEE, MMMM d, yyyy")}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-primary-600" />
                    {event.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-primary-600" />
                    {event.time}
                  </div>
                </div>
                <Link
                  href={`/events/${event.id}`}
                  className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors group-hover:gap-2 gap-1"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
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
