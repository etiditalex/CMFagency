"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CalendarPlus,
  ChevronDown,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Handshake,
  BadgeCheck,
  Ticket,
  BarChart3,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModal";
import { usePortal } from "@/contexts/PortalContext";

function SponsorDropdown({
  buttonClassName,
  buttonIconClassName,
  buttonTextClassName,
  buttonLabel = "Become a Sponsor",
  menuAlign = "left",
}: {
  buttonClassName: string;
  buttonIconClassName?: string;
  buttonTextClassName?: string;
  buttonLabel?: string;
  menuAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const sponsorOptions = useMemo(
    () => [
      {
        label: "High fashion model / showcase model",
        href: "https://forms.gle/vDySg2WJyUZ621EA7",
      },
      {
        // No dedicated form link provided yet; using the general interest form for now.
        label: "Award contender / competing model or designer",
        href: "https://forms.gle/GM5fRiutVXko1MaZ9",
      },
      {
        label: "Designer",
        href: "https://forms.gle/Rs1YyH1aGzfXeqE8A",
      },
      {
        label: "Volunteer",
        href: "https://forms.gle/DKvcV6g9ecjmsbwC8",
      },
      {
        label: "Creative art performance / entertainment",
        href: "https://forms.gle/DaagrPhqGMtTz3vr7",
      },
    ],
    []
  );

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={buttonClassName}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BadgeCheck className={buttonIconClassName ?? "w-5 h-5"} />
        <span className={buttonTextClassName}>{buttonLabel}</span>
        <ChevronDown className="w-5 h-5 opacity-90" />
      </button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute z-30 mt-2 w-[min(420px,calc(100vw-2rem))] max-h-[70vh] overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl",
            menuAlign === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Register as</div>
          </div>
          <div className="py-1">
            {sponsorOptions.map((opt) => (
              <a
                key={opt.label}
                role="menuitem"
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                {opt.label}
              </a>
            ))}
            <div className="border-t border-gray-100 my-1" />
            <a
              role="menuitem"
              href="https://forms.gle/GM5fRiutVXko1MaZ9"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-3 text-sm font-extrabold text-primary-700 hover:bg-primary-50"
              onClick={() => setOpen(false)}
            >
              Register Interest
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UpcomingEventsPage() {
  const { isPortalMember } = usePortal();
  const heroImage =
    "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg";

  // Google Calendar: all-day event (end date is exclusive)
  const googleCalendarUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent("Coast Fashion and Modelling Awards 2026 (CFMA 2026)")}` +
    `&dates=${encodeURIComponent("20260815/20260816")}` +
    `&details=${encodeURIComponent(
      "Join CFMA 2026 in Mombasa, Kenya. Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism.\n\nEvent details: https://cmfagency.co.ke/events/upcoming"
    )}` +
    `&location=${encodeURIComponent("Mombasa, Kenya")}` +
    `&ctz=${encodeURIComponent("Africa/Nairobi")}`;

  const galleryImages = useMemo(
    () => [
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
    ],
    []
  );

  const [slideIndex, setSlideIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSlideDir(1);
      setSlideIndex((prev) => (prev + 1) % galleryImages.length);
    }, 4500);
    return () => clearInterval(t);
  }, [galleryImages.length]);

  const goPrev = () => {
    setSlideDir(-1);
    setSlideIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const goNext = () => {
    setSlideDir(1);
    setSlideIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const [enquiry, setEnquiry] = useState({
    name: "",
    organization: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const onSubmitEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const subject = encodeURIComponent("CFMA 2026 - Partnership / Sponsorship Enquiry");
    const body = encodeURIComponent(
      `Name: ${enquiry.name}\nOrganization: ${enquiry.organization}\nEmail: ${enquiry.email}\n\nMessage / Partnership Interest:\n${enquiry.message}`
    );

    // opens user mail client; still keeps a success state in UI
    if (typeof window !== "undefined") {
      window.location.href = `mailto:info@cmfagency.co.ke?subject=${subject}&body=${body}`;
    }
  };

  const tocItems = useMemo(
    () => [
      { href: "#sec-details", label: "Event Details" },
      { href: "#sec-overview", label: "Event Overview" },
      { href: "#sec-why", label: "Why This Event Matters" },
      { href: "#sec-highlights", label: "Event Highlights" },
      { href: "#sec-gallery", label: "Gallery & Highlights (2025)" },
      { href: "#sec-enquiries", label: "Enquiries" },
    ],
    []
  );

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[700px] md:min-h-[820px]">
      <div className="absolute inset-0">
        <Image
            src={heroImage}
            alt="CFMA 2026"
          fill
          className="object-cover object-center"
          priority
        />
          <div className="absolute inset-0 bg-black/65" />
        </div>

        {/* Colorful accents */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-secondary-500/30 blur-3xl" />
          <div className="absolute top-10 -right-24 w-80 h-80 rounded-full bg-primary-500/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[520px] h-[240px] rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>
      
        <div className="container-custom relative z-10 pt-14 pb-24 md:pt-20 md:pb-28">
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

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col items-stretch sm:items-center gap-4">
              {/* Primary actions */}
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

              {/* Secondary links (less visual weight) */}
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
            href="/events?filter=upcoming"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Events
          </Link>

          <div className="grid grid-cols-1 gap-8">
            {/* Legacy Table of Contents (kept for reference, now replaced by inline navigation) */}
            <aside className="hidden">
              <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Concept Note</div>
                <div className="mt-1 font-extrabold text-gray-900">CFMA 2026</div>
                <div className="mt-4 space-y-1 text-sm">
                  {tocItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block rounded-md px-3 py-2 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>

                <div className="mt-6 border-t border-gray-200 pt-5 space-y-3">
                  <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Quick Actions</div>
                  <a
                    href="#sec-enquiries"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-600 hover:bg-secondary-700 text-white font-semibold px-4 py-2.5 shadow"
                  >
                    <Handshake className="w-4 h-4" />
                    Partner With Us
                  </a>
                        <button
                          type="button"
                          onClick={() => setTicketModalOpen(true)}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold px-4 py-2.5 shadow whitespace-nowrap"
                        >
                          <Ticket className="w-4 h-4" />
                          Buy Ticket Online
                        </button>
                  <SponsorDropdown
                    buttonClassName="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 shadow"
                    buttonIconClassName="w-4 h-4"
                    buttonTextClassName="text-sm"
                    buttonLabel="Participate as"
                    menuAlign="left"
                  />
                  <a
                    href="/downloads/sponsorship-proposal-2026.pdf"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-2.5"
                    download
                  >
                    <Download className="w-4 h-4" />
                    Sponsorship Proposal
                  </a>
                </div>
              </div>
            </aside>

            {/* Document */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-5xl mx-auto"
            >
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8 md:p-12">
                  {/* Document header */}
                  <header className="border-b border-gray-200 pb-6 mb-8">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Concept Note</div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                        Coast Fashion and Modelling Awards 2026 (CFMA 2026)
                      </h2>
                      <p className="text-gray-700 font-medium">
                        Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism
                      </p>
                    </div>

                    {/* Inline navigation + quick actions (centered) */}
                    <div className="mt-6 max-w-4xl mx-auto">
                      <div className="text-xs font-bold tracking-widest text-gray-500 uppercase text-center">
                        On this page
                      </div>
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

                  {/* Event Details */}
                  <section id="sec-details" className="scroll-mt-28">
                    <div className="w-full">
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* Event Overview */}
                  <section id="sec-overview" className="scroll-mt-28">
                    <div className="w-full">
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
                      </div>
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* Why This Event Matters */}
                  <section id="sec-why" className="scroll-mt-28">
                    <div className="w-full">
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* Event Highlights */}
                  <section id="sec-highlights" className="scroll-mt-28">
                    <div className="w-full">
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* Gallery */}
                  <section id="sec-gallery" className="scroll-mt-28">
                    <div className="w-full">
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* Enquiries */}
                  <section id="sec-enquiries" className="scroll-mt-28">
                    <div className="w-full">
                      <h3 className="text-2xl font-bold text-gray-900">Enquiries</h3>
                      <p className="text-gray-600 mt-2">
                        Partnership, sponsorship, participation, and general enquiries.
                      </p>

                      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5">
                        {submitted ? (
                          <div className="rounded-xl bg-secondary-50 border border-secondary-100 p-4">
                            <div className="font-semibold text-gray-900">Thanks! Your enquiry is ready to send.</div>
                            <div className="text-gray-600 mt-1">
                              If your email app didn’t open, you can also contact us via the{" "}
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
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
      </div>
      </section>

      <CmfAwardsTicketModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} />
    </div>
  );
}

