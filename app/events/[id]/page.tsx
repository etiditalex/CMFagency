"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Users, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useParams } from "next/navigation";

// All events data - matching the events page
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
  status: "past",
  category: "Fashion & Modelling",
  registrationOpen: false,
  tickets: [
    { type: "Early Bird", price: 1000, currency: "KSh" },
    { type: "Gate", price: 3000, currency: "KSh" },
    { type: "Advance", price: 2000, currency: "KSh" },
    { type: "VIP", price: 5000, currency: "KSh" },
    { type: "VVIP", price: 7500, currency: "KSh" },
  ],
};

const allEvents = [
  featuredEvent,
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

const getEventById = (id: number) => {
  return allEvents.find((e) => e.id === id);
};

export default function EventDetailPage() {
  const params = useParams();
  const event = getEventById(Number(params.id));
  const [showRSVP, setShowRSVP] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [submitted, setSubmitted] = useState(false);

  if (!event) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events" className="btn-primary">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    setSubmitted(true);
    setTimeout(() => {
      setShowRSVP(false);
      setSubmitted(false);
    }, 2000);
  };

  // Generate schedule based on event type
  const generateSchedule = (event: any) => {
    if (event.id === 1) {
      // Mr and Ms Deaf Kenya schedule
      return [
        { time: "6:00 PM", activity: "Registration & Welcome Reception" },
        { time: "6:30 PM", activity: "Opening Ceremony & Introduction of Contestants" },
        { time: "7:00 PM", activity: "Talent Showcase & Cultural Performances" },
        { time: "8:00 PM", activity: "Fashion & Evening Wear Competition" },
        { time: "9:00 PM", activity: "Question & Answer Session" },
        { time: "10:00 PM", activity: "Awards Ceremony & Crowning of Winners" },
        { time: "11:00 PM", activity: "Closing & Networking" },
      ];
    }
    // Default schedule for other events
    return [
      { time: "Opening", activity: "Registration & Welcome" },
      { time: "Main Session", activity: event.description },
      { time: "Closing", activity: "Networking & Closing Remarks" },
    ];
  };

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <Link
          href="/events"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden mb-8"
            >
              <div className="relative h-96">
                <Image
                  src={event.image}
                  alt={event.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-4 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                    {event.category}
                  </span>
                  <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                    event.status === "upcoming" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {event.status === "upcoming" ? "Upcoming" : "Past Event"}
                  </span>
                </div>
                <h1 className="text-4xl font-bold mb-4 text-gray-900">{event.title}</h1>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                  {event.description}
                </p>

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-6 h-6 text-primary-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900">Date</div>
                      <div className="text-gray-600">{format(event.date, "EEEE, MMMM d, yyyy")}</div>
                      {"endDate" in event && event.endDate && (
                        <div className="text-sm text-gray-500">
                          to {format(event.endDate, "MMMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-6 h-6 text-primary-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900">Time</div>
                      <div className="text-gray-600">{event.time}</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-6 h-6 text-primary-600 mt-1" />
                    <div>
                      <div className="font-semibold text-gray-900">Location</div>
                      <div className="text-gray-600">{event.location}</div>
                      {"fullLocation" in event && event.fullLocation && (
                        <div className="text-sm text-gray-500">{event.fullLocation}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tickets for Gala Awards */}
                {event.id === 1 && "tickets" in event && event.tickets && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Ticket Pricing</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {event.tickets.map((ticket: any, index: number) => (
                        <div
                          key={index}
                          className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="font-semibold text-gray-900 mb-1">{ticket.type}</div>
                          <div className="text-2xl font-bold text-primary-600">
                            {ticket.currency} {ticket.price.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4 text-gray-900">Event Schedule</h2>
                  <div className="space-y-3">
                    {generateSchedule(event).map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="font-semibold text-primary-600 min-w-[150px]">
                          {item.time}
                        </div>
                        <div className="text-gray-700">{item.activity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 sticky top-24"
            >
              <h3 className="text-xl font-bold mb-4 text-gray-900">Register for Event</h3>
              {event.status === "upcoming" ? (
                <>
                  {!showRSVP ? (
                    <button
                      onClick={() => setShowRSVP(true)}
                      className="w-full btn-primary mb-4"
                    >
                      RSVP Now
                    </button>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      {submitted ? (
                        <div className="flex items-center justify-center space-x-2 text-green-600 py-4">
                          <CheckCircle className="w-5 h-5" />
                          <span>Registration Successful!</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 btn-primary">
                            Submit
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRSVP(false)}
                            className="flex-1 btn-outline"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-4">This event has already taken place.</p>
                  <Link href="/events" className="btn-primary w-full">
                    View Other Events
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
