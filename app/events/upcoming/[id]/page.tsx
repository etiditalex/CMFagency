"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Handshake,
  Loader2,
  MapPin,
  ArrowRight,
  Ticket,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModal";
import SponsorDropdown from "@/components/SponsorDropdown";
import { resolveFusionModalTicketTier } from "@/lib/fusion-general-admission-tier";
import { usePortal } from "@/contexts/PortalContext";
import { supabase } from "@/lib/supabase";

type TicketTierRow = {
  id: string;
  label: string;
  slug: string;
  unit_amount_kes: number;
  inclusions?: string[];
  people_per_package?: number;
};

type DbEvent = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  time: string | null;
  description: string | null;
  full_description: string | null;
  image_url: string | null;
  default_image_url: string | null;
  ticket_campaign_slug: string | null;
  ticket_price_kes?: number | null;
  ticket_tiers?: TicketTierRow[] | null;
  payment_link: string | null;
  document_url: string | null;
  document_label: string | null;
  map_url: string | null;
  gallery: string[] | null;
  image_focus?: string | null;
  free_registration?: boolean | null;
  lipa_pole_pole?: boolean | null;
};

function buildGoogleCalendarUrl(event: Pick<DbEvent, "title" | "event_date" | "end_date" | "time" | "location" | "description">): string {
  const d = event.event_date.replace(/-/g, "");
  const endD = (event.end_date || event.event_date).replace(/-/g, "");
  const startStr = `${d}T090000`;
  const endStr = `${endD}T170000`;
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(event.title)}` +
    `&dates=${startStr}/${endStr}` +
    `&details=${encodeURIComponent(event.description || "")}` +
    `&location=${encodeURIComponent(event.location || "")}`
  );
}

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
      {/* Hero - overflow-visible so "Participate as" dropdown is not clipped */}
      <section className="relative overflow-visible min-h-[500px] md:min-h-[600px]">
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

function DbUpcomingEventDetail({ event }: { event: DbEvent }) {
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [modalTiersOverride, setModalTiersOverride] = useState<TicketTierRow[] | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(event.event_date);
  const imgUrl = event.image_url || event.default_image_url || "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg";
  const objectPosition = (event.image_focus as string | null) || "center center";
  const eventDate = new Date(event.event_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const hasTicket = !!event.ticket_campaign_slug?.trim();
  const hasTieredTickets = (event.ticket_tiers?.length ?? 0) > 0;
  const hasPayment = !!event.payment_link;
  const hasFreeReg = !!event.free_registration;
  const hasDocument = !!event.document_url;
  const hasMap = !!event.map_url;
  const calendarUrl = buildGoogleCalendarUrl(event);
  const dateOptions = (() => {
    const startIso = event.event_date;
    const endIso = event.end_date && event.end_date !== startIso ? event.end_date : null;
    return [startIso, ...(endIso ? [endIso] : [])];
  })();
  const tiers = (event.ticket_tiers ?? []) as TicketTierRow[];

  const inlineGeneralTiers = useMemo((): TicketTierRow[] | null => {
    if (!hasTicket || hasTieredTickets || hasFreeReg) return null;
    const slug = event.ticket_campaign_slug!.trim();
    const p = Number(event.ticket_price_kes);
    if (!Number.isFinite(p) || p < 1) return null;
    return [{ id: `ga-${slug}`, label: "General admission", slug, unit_amount_kes: Math.round(p) }];
  }, [hasTicket, hasTieredTickets, hasFreeReg, event.ticket_campaign_slug, event.ticket_price_kes]);

  const closeTicketModal = () => {
    setTicketModalOpen(false);
    setModalTiersOverride(null);
  };

  const openTieredCheckout = () => {
    setModalTiersOverride(null);
    setTicketModalOpen(true);
  };

  const openGeneralCheckout = async () => {
    if (inlineGeneralTiers) {
      setTicketModalOpen(true);
      return;
    }
    const slug = event.ticket_campaign_slug?.trim();
    if (!slug) return;
    setBuyLoading(true);
    try {
      const tier = await resolveFusionModalTicketTier(slug, event.ticket_price_kes);
      if (tier === "navigate") {
        window.location.href = `/${slug}`;
        return;
      }
      setModalTiersOverride([
        { id: tier.id, label: tier.label, slug: tier.slug, unit_amount_kes: tier.unit_amount_kes },
      ]);
      setTicketModalOpen(true);
    } finally {
      setBuyLoading(false);
    }
  };

  const tiersForModal = useMemo((): TicketTierRow[] => {
    if (modalTiersOverride) return modalTiersOverride;
    if (hasTieredTickets) return (event.ticket_tiers ?? []) as TicketTierRow[];
    return inlineGeneralTiers ?? [];
  }, [modalTiersOverride, hasTieredTickets, event.ticket_tiers, inlineGeneralTiers]);

  const shouldMountTicketModal =
    (hasTieredTickets && tiersForModal.length > 0) ||
    inlineGeneralTiers != null ||
    modalTiersOverride != null;

  return (
    <div className="pt-16 sm:pt-20 min-h-screen bg-gray-50">
      <div className="w-full px-3 sm:px-6 lg:px-10 py-5 sm:py-8">
        <Link
          href="/events/upcoming"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4 sm:mb-6 text-sm sm:text-base font-medium"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Upcoming Events
        </Link>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
            {/* Left: poster + description (matches share-style layout) */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-white">
                  <Image
                    src={imgUrl}
                    alt={event.title}
                    fill
                    className="object-contain"
                    style={{ objectPosition }}
                    priority
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8">
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">About this event</h2>
                <div className="mt-2 sm:mt-3 prose max-w-none">
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {event.full_description || event.description || ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: details + tickets */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-8 lg:sticky lg:top-24">
                <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900">{event.title}</h1>

                <div className="mt-3 space-y-2 text-gray-700 text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold break-words">{event.location ?? "—"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold">{format(eventDate, "dd MMM yyyy")}</span>
                    {endDate && event.end_date !== event.event_date && (
                      <span className="text-gray-500">– {format(endDate, "dd MMM yyyy")}</span>
                    )}
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold">{event.time}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 sm:mt-6 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <div className="font-extrabold text-gray-900 text-sm sm:text-base">Please Select Dates To Attend:</div>
                  <div className="text-xs font-semibold text-red-600 mt-1">
                    Note: Choose as many tickets as you wish to secure your spots!
                  </div>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Select date to attend"
                  >
                    {dateOptions.map((iso) => (
                      <option key={iso} value={iso}>
                        {format(new Date(iso), "EEE dd/MM/yyyy")}
                      </option>
                    ))}
                  </select>
                </div>

                {!hasFreeReg && ((hasTieredTickets && tiers.length > 0) || (hasTicket && !hasTieredTickets)) && (
                  <div className="mt-4 space-y-2 sm:space-y-3">
                    {hasTieredTickets &&
                      tiers.map((t) => (
                      <button
                        key={t.id || t.slug}
                        type="button"
                        onClick={() => openTieredCheckout()}
                        className="w-full text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 p-3 sm:p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-extrabold text-gray-900 text-sm sm:text-base">{t.label}</div>
                          <div className="font-extrabold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                            Ksh {Number(t.unit_amount_kes).toLocaleString("en-KE")}
                          </div>
                        </div>
                        {Array.isArray(t.inclusions) && t.inclusions.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {t.inclusions.join(" • ")}
                          </div>
                        )}
                      </button>
                    ))}
                    {hasTicket && !hasTieredTickets && (
                      <button
                        type="button"
                        onClick={() => void openGeneralCheckout()}
                        disabled={buyLoading}
                        className="w-full text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-70 p-3 sm:p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-extrabold text-gray-900 text-sm sm:text-base">Ticket</div>
                          <div className="font-extrabold text-gray-900 text-sm sm:text-base whitespace-nowrap">
                            {buyLoading ? (
                              <span className="inline-flex items-center gap-2 text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                                Loading…
                              </span>
                            ) : event.ticket_price_kes != null && Number(event.ticket_price_kes) > 0 ? (
                              <>Ksh {Number(event.ticket_price_kes).toLocaleString("en-KE")}</>
                            ) : (
                              <span className="text-gray-600 font-semibold text-xs sm:text-sm">Tap to load price</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">Pay in full or use Lipa Pole Pole in checkout.</div>
                      </button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-base">
                  {hasFreeReg && (
                    <Link
                      href={`/events/register/${event.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 transition-colors"
                    >
                      <Ticket className="w-5 h-5" />
                      Register
                    </Link>
                  )}
                  {hasTieredTickets && !hasFreeReg && (
                    <button
                      type="button"
                      onClick={() => openTieredCheckout()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold py-3 px-4 transition-colors"
                    >
                      <Ticket className="w-5 h-5" />
                      Buy Ticket Online
                    </button>
                  )}
                  {hasTicket && !hasFreeReg && !hasTieredTickets && (
                    <button
                      type="button"
                      disabled={buyLoading}
                      onClick={() => void openGeneralCheckout()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black disabled:opacity-70 text-white font-semibold py-3 px-4 transition-colors"
                    >
                      {buyLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                      ) : (
                        <Ticket className="w-5 h-5 shrink-0" />
                      )}
                      {buyLoading ? "Opening checkout…" : "Buy Ticket Online"}
                    </button>
                  )}
                  {hasPayment && !hasFreeReg && (
                    <a
                      href={event.payment_link!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 transition-colors"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Pay Now
                    </a>
                  )}
                  {hasDocument && (
                    <a
                      href={event.document_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary-600 text-primary-600 hover:bg-primary-50 font-semibold py-3 px-4 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      {event.document_label || "Download"}
                    </a>
                  )}
                  {hasMap && (
                    <a
                      href={event.map_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 hover:border-primary-500 text-gray-700 hover:text-primary-600 font-semibold py-3 px-4 transition-colors"
                    >
                      <MapPin className="w-5 h-5" />
                      Map
                    </a>
                  )}
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 hover:border-primary-500 text-gray-700 hover:text-primary-600 font-semibold py-3 px-4 transition-colors"
                  >
                    <CalendarPlus className="w-5 h-5" />
                    Calendar
                  </a>
                  
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {shouldMountTicketModal && (
        <CmfAwardsTicketModal
          open={ticketModalOpen}
          onClose={closeTicketModal}
          event={{
            title: event.title,
            shortTitle: event.title,
            date: format(eventDate, "do MMMM yyyy"),
            time: event.time ?? undefined,
            location: event.location ?? undefined,
            imageUrl: (event.image_url || event.default_image_url) ?? undefined,
          }}
          tiers={tiersForModal}
        />
      )}
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
          <div className="relative w-full h-64 md:h-80 bg-white">
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-contain"
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
            
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function UpcomingEventDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const slugParam = Array.isArray(idParam) ? idParam[0] : idParam;
  const hardcodedEvent = slugParam ? upcomingEventsData[slugParam] : undefined;

  const [dbEvent, setDbEvent] = useState<DbEvent | null>(null);
  const [loading, setLoading] = useState(!!slugParam && !hardcodedEvent);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (hardcodedEvent || !slugParam) {
      if (!slugParam) setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");
    const load = async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date,location,time,description,full_description,image_url,default_image_url,ticket_campaign_slug,ticket_price_kes,ticket_tiers,payment_link,document_url,document_label,map_url,gallery,image_focus,free_registration,lipa_pole_pole")
        .eq("slug", slugParam)
        .gte("event_date", today)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) setDbEvent(data as DbEvent);
        else setNotFound(true);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [hardcodedEvent, slugParam]);

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (notFound || (!hardcodedEvent && !dbEvent)) {
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

  if (hardcodedEvent?.isCfma) {
    return <CfmaEventDetail />;
  }

  if (hardcodedEvent) {
    return <GenericUpcomingEventDetail event={hardcodedEvent} />;
  }

  if (dbEvent) {
    return <DbUpcomingEventDetail event={dbEvent} />;
  }

  return null;
}
