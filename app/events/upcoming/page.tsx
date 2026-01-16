"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, ArrowRight, ChevronLeft, ChevronRight, Download, Handshake, BadgeCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function UpcomingEventsPage() {
  const heroImage =
    "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg";

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

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[560px] md:min-h-[680px]">
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
      
        <div className="container-custom relative z-10 py-14 md:py-20">
        <motion.div
            initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
            className="max-w-4xl"
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

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3 text-white/95">
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
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#enquiries"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-600 hover:bg-secondary-700 text-white font-semibold px-6 py-3 shadow-lg"
              >
                <Handshake className="w-5 h-5" />
                Partner With Us
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#enquiries"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 shadow-lg"
              >
                <BadgeCheck className="w-5 h-5" />
                Become a Sponsor
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/downloads/sponsorship-proposal-2026.pdf"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6 py-3 shadow-lg"
                download
              >
                <Download className="w-5 h-5" />
                Download Sponsorship Proposal
              </a>
              <a
                href="/downloads/concept-note-2026.pdf"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3 shadow-lg backdrop-blur-md"
                download
              >
                <Download className="w-5 h-5" />
                Download Concept Note (2026)
              </a>
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Table of Contents (desktop) */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 bg-white rounded-xl shadow-lg border border-gray-200 p-5">
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Concept Note</div>
                <div className="mt-1 font-extrabold text-gray-900">CFMA 2026</div>
                <div className="mt-4 space-y-1 text-sm">
                  {[
                    { href: "#sec-details", label: "1. Event Details" },
                    { href: "#sec-overview", label: "2. Event Overview" },
                    { href: "#sec-why", label: "3. Why This Event Matters" },
                    { href: "#sec-involved", label: "4. Get Involved / Participate" },
                    { href: "#sec-highlights", label: "5. Event Highlights" },
                    { href: "#sec-gallery", label: "6. Gallery & Highlights (2025)" },
                    { href: "#sec-enquiries", label: "7. Enquiries" },
                  ].map((item) => (
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
                  <a
                    href="#sec-enquiries"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 shadow"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    Become a Sponsor
                  </a>
                  <a
                    href="/downloads/concept-note-2026.pdf"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-2.5"
                    download
                  >
                    <Download className="w-4 h-4" />
                    Download Concept Note
                  </a>
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
              className="lg:col-span-9"
            >
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8 md:p-12">
                  {/* Document header */}
                  <header className="border-b border-gray-200 pb-6 mb-8">
                    <div className="flex flex-col gap-2">
                      <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Concept Note</div>
                      <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                        Coast Fashion and Modelling Awards 2026 (CFMA 2026)
                      </h2>
                      <p className="text-gray-700 font-medium">
                        Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism
                      </p>
                    </div>

                    {/* Mobile quick actions */}
                    <div className="lg:hidden mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <a
                        href="#sec-enquiries"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary-600 hover:bg-secondary-700 text-white font-semibold px-4 py-3 shadow"
                      >
                        <Handshake className="w-4 h-4" />
                        Partner With Us
                      </a>
                      <a
                        href="#sec-enquiries"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-3 shadow"
                      >
                        <BadgeCheck className="w-4 h-4" />
                        Become a Sponsor
                      </a>
                      <a
                        href="/downloads/concept-note-2026.pdf"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-3"
                        download
                      >
                        <Download className="w-4 h-4" />
                        Concept Note
                      </a>
                      <a
                        href="/downloads/sponsorship-proposal-2026.pdf"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-4 py-3"
                        download
                      >
                        <Download className="w-4 h-4" />
                        Proposal
                      </a>
                    </div>
                  </header>

                  {/* 1. Event Details */}
                  <section id="sec-details" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        1
                      </div>
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* 2. Event Overview */}
                  <section id="sec-overview" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        2
                      </div>
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* 3. Why This Event Matters */}
                  <section id="sec-why" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        3
                      </div>
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* 4. Get Involved */}
                  <section id="sec-involved" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        4
                      </div>
                      <div className="w-full">
                        <h3 className="text-2xl font-bold text-gray-900">Get Involved / Participate as a</h3>
                        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-700 list-decimal pl-5">
                          {[
                            "High fashion model / showcase model",
                            "Award contender / competing model or designer",
                            "Designer",
                            "Volunteer",
                            "Creative art performance / entertainment",
                          ].map((item) => (
                            <li key={item} className="pl-1">
                              {item}
                            </li>
                          ))}
                        </ol>
                        <div className="mt-6">
                          <a href="#sec-enquiries" className="btn-primary inline-flex items-center gap-2">
                            Register Interest
                            <ArrowRight className="w-5 h-5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* 5. Event Highlights */}
                  <section id="sec-highlights" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        5
                      </div>
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* 6. Gallery */}
                  <section id="sec-gallery" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        6
                      </div>
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
                    </div>
                  </section>

                  <div className="my-10 border-t border-dashed border-gray-200" />

                  {/* 7. Enquiries */}
                  <section id="sec-enquiries" className="scroll-mt-28">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-extrabold">
                        7
                      </div>
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
                                  href="/downloads/concept-note-2026.pdf"
                                  download
                                >
                                  Concept Note 2026
                                </a>{" "}
                                ·{" "}
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
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </div>
      </div>
      </section>
    </div>
  );
}

