"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const pastEvents = [
  {
    id: "mr-mrs-deaf-kenya-2025",
    title: "Mr and Mrs Deaf Kenya 2025",
    date: new Date(2025, 0, 15), // January 2025
    location: "Kenya",
    description: "A prestigious event celebrating the beauty, talent, and achievements of the deaf community in Kenya.",
  },
  {
    id: "global-women-empowerment-summit-2025",
    title: "Global Women Empowerment Summit",
    date: new Date(2025, 8, 1), // September 2025
    location: "Kenya",
    description: "Hosted by Global Women Impact Foundation, this summit brought together women leaders and advocates for empowerment and equality.",
    hostedBy: "Global Women Impact Foundation",
  },
  {
    id: "kings-experience-coast-edition-2025",
    title: "The Kings Experience Coast Edition",
    date: new Date(2025, 8, 15), // September 2025
    location: "Coast Region, Kenya",
    description: "An unforgettable entertainment experience featuring top artists and performers from the coast region.",
  },
  {
    id: "mombasa-international-show-2025",
    title: "Mombasa International Show 2025",
    date: new Date(2025, 8, 20), // September 2025
    location: "Mombasa, Kenya",
    description: "A grand international showcase celebrating culture, talent, and excellence in Mombasa.",
  },
  {
    id: "coast-fashions-modelling-awards-2025",
    title: "Coast Fashions and Modelling Awards 2025",
    date: new Date(2025, 4, 15), // May 2025
    location: "Coast Region, Kenya",
    description: "Celebrating excellence in fashion and modeling along the Kenyan coast with prestigious awards.",
  },
  {
    id: "marketing-students-conference-2025",
    title: "Marketing Students Conference",
    date: new Date(2025, 2, 10), // March 2025
    location: "Nairobi, Kenya",
    description: "A comprehensive conference for marketing students held at St. Paul's University, featuring industry insights and networking opportunities.",
    venue: "St. Paul's University",
  },
  {
    id: "miss-valentines-mombasa-2025",
    title: "Crowning of Miss Valentines Mombasa 2025",
    date: new Date(2025, 1, 14), // February 2025
    location: "Mombasa, Kenya",
    description: "A glamorous beauty pageant celebrating love and beauty in Mombasa with the crowning of Miss Valentines.",
  },
  {
    id: "mr-miss-mombasa-international-show",
    title: "Mr and Miss Mombasa International Show",
    date: new Date(2025, 8, 25), // September 2025
    location: "Mombasa, Kenya",
    description: "An international showcase celebrating beauty, talent, and culture with contestants from across the region.",
  },
  {
    id: "coast-students-conference-2025",
    title: "Coast Students Conference",
    date: new Date(2025, 8, 30), // September 2025
    location: "Pwani University, Kenya",
    description: "A dynamic conference bringing together students from the coast region for learning, networking, and collaboration.",
    venue: "Pwani University",
  },
];

export default function PastEventsPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="section-padding bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Past Events
            </h1>
            <p className="text-lg text-gray-600">
              Relive the memorable moments from our past events. Explore event details, galleries, and share your feedback.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Events List */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-200"
              >
                <Link href={`/events/past/${event.id}`} className="block">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                          {event.title}
                        </h3>
                        {event.hostedBy && (
                          <p className="text-sm text-gray-500 mb-2">Hosted by: {event.hostedBy}</p>
                        )}
                        {event.venue && (
                          <p className="text-sm text-gray-500 mb-2">Venue: {event.venue}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-primary-600" />
                        {format(event.date, "MMMM d, yyyy")}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-primary-600" />
                        {event.location}
                      </div>
                    </div>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex items-center text-primary-600 font-semibold text-sm group">
                      <span>View Event Details</span>
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

