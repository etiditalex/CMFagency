"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Handshake,
  MapPin,
  ArrowRight,
  Ticket,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModal";
import SponsorDropdown from "@/components/SponsorDropdown";
import { usePortal } from "@/contexts/PortalContext";

const CFMA_2026_ID = "coast-fashion-modelling-awards-2026";

const galleryImages = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202512_uju1mf.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20259_xdcl8g.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202510_a1pxnz.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202511_rsqv2k.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202513_zkzinl.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20258_r7vl6r.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20257_aptp81.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20253_s06u7f.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20255_dwiebf.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20254_jqmkem.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448263/HighFashionAudition20251_ufpxud.jpg",
];

const upcomingEventsData: Record<
  string,
  {
    title: string;
    date: Date;
    location: string;
    description: string;
    fullDescription?: string;
    image: string;
    isCfma?: boolean;
  }
> = {
  [CFMA_2026_ID]: {
    title: "Coast Fashion and Modelling Awards 2026 (CMFA)",
    date: new Date(2026, 7, 15),
    location: "Mombasa, Kenya",
    description:
      "Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
    isCfma: true,
  },
};

function CfmaEventDetail() {
  const { isPortalMember } = usePortal();
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [enquiry, setEnquiry] = useState({
    name: "",
    organization: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const googleCalendarUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent("Coast Fashion and Modelling Awards 2026 (CFMA 2026)")}` +
    `&dates=${encodeURIComponent("20260815/20260816")}` +
    `&details=${encodeURIComponent(
      "Join CFMA 2026 in Mombasa, Kenya. Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism.\n\nEvent details: https://cmfagency.co.ke/events/upcoming/coast-fashion-modelling-awards-2026"
    )}` +
    `&location=${encodeURIComponent("Mombasa, Kenya")}` +
    `&ctz=${encodeURIComponent("Africa/Nairobi")}`;

  useEffect(() => {
    const t = setInterval(() => {
      setSlideDir(1);
      setSlideIndex((prev) => (prev + 1) % galleryImages.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const goPrev = () => {
    setSlideDir(-1);
    setSlideIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };
  const goNext = () => {
    setSlideDir(1);
    setSlideIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const onSubmitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const subject = encodeURIComponent("CFMA 2026 - Partnership / Sponsorship Enquiry");
    const body = encodeURIComponent(
      `Name: ${enquiry.name}\nOrganization: ${enquiry.organization}\nEmail: ${enquiry.email}\n\nMessage / Partnership Interest:\n${enquiry.message}`
    );
    if (typeof window !== "undefined") {
      window.location.href = `mailto:info@cmfagency.co.ke?subject=${subject}&body=${body}`;
    }
  };

  const tocItems = [
    { href: "#sec-details", label: "Event Details" },
    { href: "#sec-overview", label: "Event Overview" },
    { href: "#sec-why", label: "Why This Event Matters" },
    { href: "#sec-highlights", label: "Event Highlights" },
    { href: "#sec-gallery", label: "Gallery & Highlights (2025)" },
    { href: "#sec-enquiries", label: "Enquiries" },
  ];

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[500px] md:min-h-[600px]">
        <div className="absolute inset-0">
          <Image
            src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg"
            alt="CFMA 2026"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="container-custom relative z-10 pt-14 pb-24 md:pt-20 md:pb-28 flex items-center min-h-[500px] md:min-h-[600px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md text-white font-semibold">
              <Calendar className="w-4 h-4" />
              Upcoming Event
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-extrabold text-white leading-tight drop-shadow-2xl">
              Coast Fashion and Modelling Awards 2026
            </h1>
            <p className="mt-4 text-lg md:text-2xl text-white drop-shadow-lg">
              Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism
            </p>
            <div className="mt-6 flex flex-col items-center sm:flex-row sm:items-center sm:justify-center gap-3 text-white/95">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
                <Calendar className="w-5 h-5 text-secondary-300" />
                <span className="font-semibold">15th August 2026</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
                <MapPin className="w-5 h-5 text-secondary-300" />
                <span className="font-semibold">Mombasa, Kenya</span>
              </div>
            </div>
            <div className="mt-8 flex flex-col items-stretch sm:items-center gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setTicketModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold px-6 py-3 shadow-lg whitespace-nowrap"
                >
                  <Ticket className="w-5 h-5" />
                  Buy Ticket Online
                  <ArrowRight className="w-5 h-5" />
                </button>
                <SponsorDropdown
                  buttonLabel="Participate as"
                  buttonClassName="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 shadow-lg whitespace-nowrap"
                />
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 shadow-lg backdrop-blur-md border border-white/30 whitespace-nowrap"
                >
                  <Handshake className="w-5 h-5" />
                  Partner With Us
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/90">
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white font-semibold"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Add to Google Calendar
                </a>
                <a
                  href="/downloads/sponsorship-proposal-2026.pdf"
                  className="inline-flex items-center gap-2 hover:text-white font-semibold"
                  download
                >
                  <Download className="w-4 h-4" />
                  Download Sponsorship Proposal
                </a>
                {isPortalMember && (
                  <Link
                    href="/dashboard/campaigns?type=ticket"
                    className="inline-flex items-center gap-2 hover:text-white font-semibold"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View ticket sales in Fusion Xpress
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-gray-100/60">
        <div className="container-custom py-10">
          <Link
            href="/events/upcoming"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Upcoming Events
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-5xl mx-auto"
          >
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 sm:p-8 md:p-12">
                <header className="border-b border-gray-200 pb-6 mb-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Concept Note</div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center">
                      Coast Fashion and Modelling Awards 2026 (CMF Awards 2026)
                    </h2>
                    <p className="text-gray-700 font-medium text-center">
                      Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism
                    </p>
                  </div>
                  <div className="mt-6 max-w-4xl mx-auto">
                    <div className="text-xs font-bold tracking-widest text-gray-500 uppercase text-center">On this page</div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {tocItems.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a
                        href="#sec-enquiries"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-600 hover:bg-secondary-700 text-white font-semibold px-4 py-3 shadow"
                      >
                        <Handshake className="w-4 h-4" />
                        Partner With Us
                      </a>
                      <button
                        type="button"
                        onClick={() => setTicketModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold px-4 py-3 shadow whitespace-nowrap"
                      >
                        <Ticket className="w-4 h-4" />
                        Buy Ticket Online
                      </button>
                      <SponsorDropdown
                        buttonClassName="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-3 shadow"
                        buttonIconClassName="w-4 h-4"
                        buttonLabel="Participate as"
                        menuAlign="right"
                      />
                      <a
                        href="/downloads/sponsorship-proposal-2026.pdf"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-3"
                        download
                      >
                        <Download className="w-4 h-4" />
                        Proposal
                      </a>
                    </div>
                  </div>
                </header>

                <section id="sec-details" className="scroll-mt-28">
                  <h3 className="text-2xl font-bold text-gray-900">Event Details</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900">Date</div>
                        <div>15th August 2026</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-900">Location</div>
                        <div>Mombasa, Kenya</div>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="my-10 border-t border-dashed border-gray-200" />

                <section id="sec-overview" className="scroll-mt-28">
                  <h3 className="text-2xl font-bold text-gray-900">Event Overview</h3>
                  <div className="mt-4 prose prose-lg max-w-none">
                    <p className="text-gray-700">
                      The Coast Fashion and Modelling Awards 2026 (CFMA 2026) is a premier creative industry event
                      organized by Changer Fusions, building on the success of the 2025 edition which hosted over 350
                      participants and awarded 30 outstanding contributors in the fashion and modelling industry.
                    </p>
                    <p className="text-gray-700">
                      CFMA 2026 is a flagship platform celebrating coastal heritage, empowering youth talent, and
                      promoting sustainable fashion practices and eco-tourism initiatives in the region.
                    </p>
                    <p className="text-gray-700">
                      <strong>Buy tickets online</strong> for the CMF Awards 2026 in Mombasa. One of the premier{" "}
                      <strong>events Mombasa 2026</strong>—join us on 15th August for an unforgettable celebration
                      of fashion and talent.
                    </p>
                  </div>
                </section>

                <div className="my-10 border-t border-dashed border-gray-200" />

                <section id="sec-why" className="scroll-mt-28">
                  <h3 className="text-2xl font-bold text-gray-900">Why This Event Matters</h3>
                  <ul className="mt-4 space-y-3 text-gray-700">
                    {[
                      "Provides a platform for youth creatives and emerging talent to showcase their skills.",
                      "Preserves and promotes the rich cultural heritage of the Coast.",
                      "Advocates for sustainable and eco-friendly fashion practices.",
                      "Promotes eco-tourism and responsible destination branding.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-secondary-600 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="my-10 border-t border-dashed border-gray-200" />

                <section id="sec-highlights" className="scroll-mt-28">
                  <h3 className="text-2xl font-bold text-gray-900">Event Highlights</h3>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { title: "Fashion Showcases", desc: "Heritage-inspired and eco-conscious designs" },
                      { title: "Modelling Competitions", desc: "Emerging and professional models" },
                      { title: "Cultural Performances", desc: "Music, dance, and traditional arts" },
                      { title: "Awards Ceremony", desc: "Recognition across 30+ categories" },
                      { title: "Eco-Tourism Exhibitions", desc: "Coastal destinations and conservation projects" },
                    ].map((h) => (
                      <div key={h.title} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                        <div className="font-bold text-gray-900">{h.title}</div>
                        <div className="text-gray-600">{h.desc}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="my-10 border-t border-dashed border-gray-200" />

                <section id="sec-gallery" className="scroll-mt-28">
                  <h3 className="text-2xl font-bold text-gray-900">Gallery & Highlights from 2025</h3>
                  <p className="text-gray-600 mt-2">
                    Highlights from the 2025 Coast Fashion and Modelling Awards – celebrating talent and heritage.
                  </p>
                  <div className="mt-6 relative rounded-xl overflow-hidden bg-gray-100 aspect-[16/9]">
                    <AnimatePresence initial={false} mode="wait" custom={slideDir}>
                      <motion.div
                        key={slideIndex}
                        initial={{ opacity: 0, x: slideDir > 0 ? 24 : -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: slideDir > 0 ? -24 : 24 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={galleryImages[slideIndex]}
                          alt={`High fashion audition 2025 - ${slideIndex + 1}`}
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, 900px"
                        />
                        <div className="absolute inset-0 bg-black/10" />
                      </motion.div>
                    </AnimatePresence>
                    <button
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {galleryImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSlideDir(i > slideIndex ? 1 : -1);
                          setSlideIndex(i);
                        }}
                        className={`h-2.5 rounded-full transition-all ${
                          i === slideIndex ? "w-8 bg-primary-600" : "w-2.5 bg-gray-300 hover:bg-gray-400"
                        }`}
                        aria-label={`Go to image ${i + 1}`}
                      />
                    ))}
                  </div>
                </section>

                <div className="my-10 border-t border-dashed border-gray-200" />

                <section id="sec-enquiries" className="scroll-mt-28">
                  <h3 className="text-2xl font-bold text-gray-900">Enquiries</h3>
                  <p className="text-gray-600 mt-2">
                    Partnership, sponsorship, participation, and general enquiries.
                  </p>
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                    {submitted ? (
                      <div className="rounded-xl bg-secondary-50 border border-secondary-100 p-4">
                        <div className="font-semibold text-gray-900">Thanks! Your enquiry is ready to send.</div>
                        <div className="text-gray-600 mt-1">
                          If your email app didn't open, you can also contact us via the{" "}
                          <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-semibold">
                            Contact page
                          </Link>
                          .
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={onSubmitEnquiry} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                          <input
                            value={enquiry.name}
                            onChange={(e) => setEnquiry((p) => ({ ...p, name: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
                          <input
                            value={enquiry.organization}
                            onChange={(e) => setEnquiry((p) => ({ ...p, organization: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={enquiry.email}
                            onChange={(e) => setEnquiry((p) => ({ ...p, email: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Message / Partnership Interest
                          </label>
                          <textarea
                            value={enquiry.message}
                            onChange={(e) => setEnquiry((p) => ({ ...p, message: e.target.value }))}
                            rows={5}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
                            required
                          />
                        </div>
                        <button type="submit" className="w-full btn-primary inline-flex items-center justify-center gap-2">
                          Send Enquiry
                          <ArrowRight className="w-5 h-5" />
                        </button>
                        <div className="text-xs text-gray-500">
                          Downloads:{" "}
                          <a
                            className="text-primary-600 hover:text-primary-700 font-semibold"
                            href="/downloads/sponsorship-proposal-2026.pdf"
                            download
                          >
                            Sponsorship Proposal
                          </a>
                        </div>
                      </form>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <CmfAwardsTicketModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} />
    </div>
  );
}

function GenericUpcomingEventDetail({
  event,
}: {
  event: (typeof upcomingEventsData)[string];
}) {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <div className="container-custom py-8">
        <Link
          href="/events/upcoming"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Upcoming Events
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="relative w-full h-64 md:h-80">
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-4 left-4 bg-primary-600 rounded-lg px-5 py-4 shadow-lg">
              <div className="text-white font-bold text-xl leading-tight">{format(event.date, "dd")}</div>
              <div className="text-white font-semibold text-xs uppercase tracking-wide mt-1">
                {format(event.date, "MMM")}
              </div>
            </div>
          </div>
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-6 text-gray-900">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-700 mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                <span>{format(event.date, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                <span>{event.location}</span>
              </div>
            </div>
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-700 leading-relaxed">
                {event.fullDescription || event.description}
              </p>
            </div>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-2 btn-primary"
            >
              Get in Touch
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function UpcomingEventDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const eventId = Array.isArray(idParam) ? idParam[0] : idParam;
  const event = eventId ? upcomingEventsData[eventId] : undefined;

  if (!event) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events/upcoming" className="btn-primary">
            Back to Upcoming Events
          </Link>
        </div>
      </div>
    );
  }

  if (event.isCfma) {
    return <CfmaEventDetail />;
  }

  return <GenericUpcomingEventDetail event={event} />;
}
