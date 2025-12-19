"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Search, Ticket, QrCode, Award } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

const featuredEvent = {
  id: 1,
  title: "Mr and Ms Deaf Kenya",
  subtitle: "Beauty Pageant",
  date: new Date(2024, 8, 15),
  endDate: new Date(2024, 8, 15),
  galaDate: new Date(2024, 8, 15),
  location: "Mombasa, Kenya",
  fullLocation: "Mombasa, Coast Region",
  time: "6:00 PM - 11:00 PM",
  image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
  description: "A prestigious beauty pageant celebrating the beauty, talent, and achievements of the deaf community in Kenya. This inclusive event showcases the remarkable abilities and contributions of deaf individuals, promoting awareness, inclusion, and empowerment. The pageant features contestants from across Kenya competing for the titles of Mr and Ms Deaf Kenya, highlighting their talents, advocacy work, and positive impact on society.",
  registrationOpen: false,
  tickets: [
    { type: "Early Bird", price: 1000, currency: "KSh" },
    { type: "Gate", price: 3000, currency: "KSh" },
    { type: "Advance", price: 2000, currency: "KSh" },
    { type: "VIP", price: 5000, currency: "KSh" },
    { type: "VVIP", price: 7500, currency: "KSh" },
  ],
};

const events = [
  // Fashion & Modelling Events
  {
    id: 2,
    title: "The Coast Fashion and Modeling Awards",
    date: new Date(2024, 8, 15),
    location: "Mombasa, Coast Region",
    time: "6:00 PM - 11:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "Celebrating excellence in fashion and modeling along the Kenyan coast. A prestigious awards ceremony recognizing top talent in the fashion industry.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 3,
    title: "Mr and Miss Mombasa International Show",
    date: new Date(2024, 9, 20),
    location: "Mombasa, Coast Region",
    time: "7:00 PM - 10:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
    description: "An international showcase celebrating beauty, talent, and culture. Featuring contestants from across the region competing for prestigious titles.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 4,
    title: "Mr and Miss Mbita",
    date: new Date(2024, 7, 10),
    location: "Mbita, Homa Bay County",
    time: "5:00 PM - 9:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "A local pageant celebrating the beauty and talent of Mbita's youth, promoting cultural values and community engagement.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 5,
    title: "Mr and Miss Fashion Mbita",
    date: new Date(2024, 7, 25),
    location: "Mbita, Homa Bay County",
    time: "6:00 PM - 10:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    description: "Fashion-focused competition showcasing innovative designs and modeling talent from the Mbita region.",
    status: "past",
    category: "Fashion & Modelling",
  },
  {
    id: 6,
    title: "Mr and Miss Culture Subaland",
    date: new Date(2024, 10, 5),
    location: "Subaland Region",
    time: "4:00 PM - 8:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
    description: "Cultural pageant celebrating the rich heritage and traditions of the Subaland region through fashion, talent, and cultural presentations.",
    status: "upcoming",
    category: "Fashion & Modelling",
  },
  // Marketing & Promotional Events
  {
    id: 7,
    title: "Marketing Society of Kenya Workshop",
    date: new Date(2024, 9, 12),
    location: "Nairobi, Kenya",
    time: "9:00 AM - 5:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    description: "Professional development workshop covering the latest marketing trends, strategies, and best practices in the Kenyan market.",
    status: "past",
    category: "Marketing & Promotional",
  },
  {
    id: 8,
    title: "Marketing Society Networking Mixer",
    date: new Date(2024, 10, 15),
    location: "Nairobi, Kenya",
    time: "6:00 PM - 9:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    description: "Networking event for marketing professionals to connect, share insights, and build meaningful business relationships.",
    status: "upcoming",
    category: "Marketing & Promotional",
  },
  {
    id: 9,
    title: "Brand Activation Event - Marketing Society",
    date: new Date(2024, 8, 28),
    location: "Nairobi, Kenya",
    time: "10:00 AM - 4:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
    description: "Interactive brand activation event featuring product launches, demonstrations, and engaging consumer experiences.",
    status: "past",
    category: "Marketing & Promotional",
  },
  {
    id: 10,
    title: "King Experience - Live Concert",
    date: new Date(2024, 9, 30),
    location: "Nairobi, Kenya",
    time: "7:00 PM - 11:00 PM",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
    description: "Spectacular live concert featuring Prince Indah, Okello Max, and Kelechi Africana. An unforgettable night of music and entertainment.",
    status: "past",
    category: "Marketing & Promotional",
  },
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
    description: "Collaborative promotional event showcasing joint initiatives between corporate partners and Changer Fusions Enterprises.",
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

export default function EventsPage() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

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
      <section className="section-padding">
        <div className="container-custom max-w-7xl">
          {/* Registration Status Box - Top Left */}
          {!featuredEvent.registrationOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="bg-white border-2 border-gray-900 rounded-lg px-6 py-4 text-center inline-block">
                <p className="text-lg font-bold text-gray-900">Sorry, registration has ended.</p>
              </div>
            </motion.div>
          )}

          {/* Main Event Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Left Section - Event Description */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Award Badge/Graphic */}
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-primary-500 to-secondary-500 p-5 rounded-lg shadow-lg flex-shrink-0 w-32 h-32 flex flex-col items-center justify-center">
                  <Award className="w-10 h-10 text-white mb-2" />
                  <div className="text-center">
                    <p className="text-white text-xs font-bold leading-tight">MR & MS</p>
                    <p className="text-white text-xs font-bold leading-tight">DEAF</p>
                    <p className="text-white text-sm font-bold mt-1">KENYA</p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {featuredEvent.description}
                  </p>
                  <Link
                    href={`/events/${featuredEvent.id}`}
                    className="inline-block mt-3 text-primary-600 font-semibold hover:text-primary-700 transition-colors text-sm"
                  >
                    Read More
                  </Link>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-gray-900">Date: </span>
                  <span className="text-gray-700">
                    {format(featuredEvent.date, "MM/dd/yyyy hh:mm a")} -{" "}
                    {format(featuredEvent.endDate, "MM/dd/yyyy hh:mm a")}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-gray-900">Location </span>
                  <Link href="#" className="text-primary-600 hover:text-primary-700 font-semibold">
                    {featuredEvent.location}
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Right Section - Ticket Design */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-primary-600 via-secondary-600 to-primary-700 rounded-2xl p-8 shadow-2xl relative overflow-hidden h-full flex flex-col">
                {/* Fabric-like Pattern Overlay */}
                <div className="absolute inset-0 opacity-20">
                  <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="none">
                    <defs>
                      <pattern id="fabric" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M0,30 Q15,15 30,30 T60,30" stroke="white" strokeWidth="1" fill="none" opacity="0.4"/>
                        <path d="M30,0 Q15,15 30,30 T30,60" stroke="white" strokeWidth="1" fill="none" opacity="0.4"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#fabric)" />
                  </svg>
                </div>

                {/* Decorative Blur Effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col h-full">
                  {/* Mr and Ms Deaf Kenya Title - Elegant Script Style */}
                  <div className="mb-6">
                    <h2 className="text-5xl md:text-6xl font-bold text-white leading-none" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '-1px' }}>
                      Mr & Ms
                    </h2>
                    <h2 className="text-5xl md:text-6xl font-bold text-white leading-none" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: '-1px' }}>
                      Deaf Kenya
                    </h2>
                  </div>

                  {/* Date and Location */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-3 text-white">
                      <Calendar className="w-6 h-6 flex-shrink-0" />
                      <span className="text-xl font-semibold">
                        {format(featuredEvent.galaDate, "do MMM yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <MapPin className="w-6 h-6 flex-shrink-0" />
                      <span className="text-xl font-semibold">{featuredEvent.fullLocation}</span>
                    </div>
                  </div>

                  {/* Ticket Cards - Styled like actual tickets */}
                  <div className="space-y-3 flex-1 mb-6">
                    {featuredEvent.tickets.map((ticket, index) => (
                      <motion.div
                        key={ticket.type}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                        className="bg-white rounded-lg p-4 flex items-center justify-between shadow-lg border-2 border-white/30 relative overflow-hidden"
                      >
                        {/* Barcode Pattern on Left */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-center items-center space-y-1 pr-1">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1 bg-gray-400"
                              style={{ height: `${Math.random() * 20 + 10}px` }}
                            />
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between w-full pl-10">
                          <div className="flex items-center space-x-3">
                            <Ticket className="w-5 h-5 text-primary-600" />
                            <span className="text-gray-900 font-bold text-lg">{ticket.type}</span>
                          </div>
                          <span className="text-gray-900 font-bold text-xl">
                            {ticket.currency}
                            {ticket.price.toLocaleString()}/=
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* QR Code */}
                  <div className="bg-white/15 backdrop-blur-sm rounded-lg p-6 flex flex-col items-center justify-center border-2 border-white/30">
                    <QrCode className="w-24 h-24 text-white mb-3" />
                    <div className="bg-white/20 rounded-lg px-4 py-2 mt-2">
                      <p className="text-white text-sm font-bold text-center">TO BUY TICKETS SCAN ME</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Other Events Section */}
      <section className="section-padding bg-gray-50">
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

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
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
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">
                    {event.category}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">{event.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm line-clamp-2">{event.description}</p>
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
                  <div className="flex gap-2">
                    <Link
                      href={`/events/${event.id}`}
                      className="flex-1 btn-primary text-center text-sm"
                    >
                      View Details
                    </Link>
                    {event.status === "upcoming" && (
                      <Link
                        href={`/events/${event.id}?rsvp=true`}
                        className="flex-1 btn-outline text-center text-sm"
                      >
                        RSVP
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-600 text-lg">No events found matching your criteria.</p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
