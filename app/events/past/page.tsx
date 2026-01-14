"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import Image from "next/image";

const pastEvents = [
  {
    id: "mr-mrs-deaf-kenya-2025",
    title: "Mr and Mrs Deaf Kenya 2025",
    date: new Date(2025, 0, 15), // January 2025
    location: "Kenya",
    description: "A prestigious event celebrating the beauty, talent, and achievements of the deaf community in Kenya.",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
  },
  {
    id: "global-women-empowerment-summit-2025",
    title: "Global Women Empowerment Summit",
    date: new Date(2025, 8, 1), // September 2025
    location: "Kenya",
    description: "Hosted by Global Women Impact Foundation, this summit brought together women leaders and advocates for empowerment and equality.",
    hostedBy: "Global Women Impact Foundation",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_2_adeysa.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_1_q8cocr.jpg",
  },
  {
    id: "kings-experience-coast-edition-2025",
    title: "The Kings Experience Coast Edition",
    date: new Date(2025, 8, 15), // September 2025
    location: "Coast Region, Kenya",
    description: "An unforgettable entertainment experience featuring top artists and performers from the coast region.",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_2_fixdek.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154664/The_Kings_Experience_1_ime4hx.jpg",
  },
  {
    id: "mombasa-international-show-2025",
    title: "Mombasa International Show 2025",
    date: new Date(2025, 8, 20), // September 2025
    location: "Mombasa, Kenya",
    description: "A grand international showcase celebrating culture, talent, and excellence in Mombasa.",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
  },
  {
    id: "coast-fashions-modelling-awards-2025",
    title: "Coast Fashions and Modelling Awards 2025",
    date: new Date(2025, 4, 15), // May 2025
    location: "Coast Region, Kenya",
    description: "Celebrating excellence in fashion and modeling along the Kenyan coast with prestigious awards.",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards2_defemi.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg",
  },
  {
    id: "marketing-students-conference-2025",
    title: "Marketing Students Conference",
    date: new Date(2025, 2, 10), // March 2025
    location: "Nairobi, Kenya",
    description: "A comprehensive conference for marketing students held at St. Paul's University, featuring industry insights and networking opportunities.",
    venue: "St. Paul's University",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
  },
  {
    id: "miss-valentines-mombasa-2025",
    title: "Crowning of Miss Valentines Mombasa 2025",
    date: new Date(2025, 1, 14), // February 2025
    location: "Mombasa, Kenya",
    description: "A glamorous beauty pageant celebrating love and beauty in Mombasa with the crowning of Miss Valentines.",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
  },
  {
    id: "mr-miss-mombasa-international-show",
    title: "Mr and Miss Mombasa International Show",
    date: new Date(2025, 8, 25), // September 2025
    location: "Mombasa, Kenya",
    description: "An international showcase celebrating beauty, talent, and culture with contestants from across the region.",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
  },
  {
    id: "coast-students-conference-2025",
    title: "Coast Students Conference",
    date: new Date(2025, 8, 30), // September 2025
    location: "Pwani University, Kenya",
    description: "A dynamic conference bringing together students from the coast region for learning, networking, and collaboration.",
    venue: "Pwani University",
    defaultImage: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
  },
];

export default function PastEventsPage() {
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
          <div className="space-y-8">
            {pastEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Link href={`/events/past/${event.id}`} className="block">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col md:flex-row">
                      {/* Image Section - Left Side */}
                      <div className="relative w-full md:w-80 lg:w-96 h-64 md:h-64 flex-shrink-0">
                        <Image
                          src={event.image || event.defaultImage}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                        {/* Date Box - Primary Color */}
                        <div className="absolute top-4 left-4 bg-primary-600 rounded-lg px-5 py-4 shadow-lg">
                          <div className="text-white font-bold text-xl leading-tight">
                            {format(event.date, "dd")}
                          </div>
                          <div className="text-white font-semibold text-xs uppercase tracking-wide mt-1">
                            {format(event.date, "MMM")}
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
                          {format(event.date, "MMM d, yyyy")} 08:00 - {format(new Date(event.date.getTime() + 86400000), "MMM d, yyyy")} 16:00
                        </div>

                        {/* Location - Dark Gray */}
                        <div className="text-gray-700 mb-4">
                          {event.venue ? `${event.venue}, ${event.location}` : event.location}
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 mb-6 line-clamp-2">
                          {event.description}
                        </p>

                        {/* Icons Row */}
                        <div className="flex flex-wrap gap-4 md:gap-6 text-sm mt-4">
                          <div className="flex items-center text-gray-700">
                            <MapPin className="w-4 h-4 mr-2 text-secondary-600 flex-shrink-0" />
                            <span className="uppercase font-medium">{event.location}</span>
                          </div>
                          <div className="flex items-center text-gray-700">
                            <Calendar className="w-4 h-4 mr-2 text-secondary-600 flex-shrink-0" />
                            <span className="font-medium uppercase">{format(event.date, "MMMM Do")}</span>
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
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Load More Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: pastEvents.length * 0.1 }}
            className="flex justify-center mt-12"
          >
            <button className="border-2 border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg">
              Load More
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

