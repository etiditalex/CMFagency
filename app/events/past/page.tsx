"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, ArrowRight } from "lucide-react";
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
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative section-padding overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg"
            alt="Past Events Background"
            fill
            className="object-cover object-center object-top"
            style={{ objectPosition: "center top" }}
            priority
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/80 via-secondary-800/70 to-primary-900/80"></div>
        </div>
        
        {/* Content */}
        <div className="container-custom relative z-10">
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
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative h-[400px] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200"
              >
                <Link href={`/events/past/${event.id}`} className="block h-full">
                  {/* Default Background Image - Always Visible */}
                  <div className="absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                    <Image
                      src={event.defaultImage || event.image}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    {/* Light Overlay for Default State */}
                    <div className="absolute inset-0 bg-white/40"></div>
                  </div>

                  {/* Hover Background Image - Shows on Hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-black/60"></div>
                  </div>

                  {/* Content - Always Visible */}
                  <div className="relative h-full flex flex-col p-6">
                    {/* Default Content */}
                    <div className="flex-1 group-hover:opacity-0 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
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
                    </div>

                    {/* Hover Content - Description Overlay */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="text-white">
                        <h3 className="text-2xl font-bold mb-3">{event.title}</h3>
                        <p className="text-white/90 text-sm leading-relaxed mb-4 line-clamp-4">
                          {event.description}
                        </p>
                        <div className="flex items-center text-white font-semibold text-sm">
                          <span>View Event Details</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>

                    {/* Default CTA - Hidden on Hover */}
                    <div className="flex items-center text-primary-600 font-semibold text-sm group-hover:opacity-0 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-lg p-2 px-4">
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

