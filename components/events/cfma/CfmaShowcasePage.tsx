"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarPlus,
  ChevronLeft,
  Download,
  Handshake,
  Ticket,
} from "lucide-react";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModalLazy";
import SponsorDropdown from "@/components/SponsorDropdown";
import DownloadDeferredContact from "@/components/download/DownloadDeferredContact";
import DownloadImage from "@/components/download/DownloadImage";
import { usePortal } from "@/contexts/PortalContext";

const HERO_SRC =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg";
const HERO_SIZES = "(max-width: 1024px) 100vw, 720px";
const BAND_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 560px";
const belowFoldClass = "[content-visibility:auto] [contain-intrinsic-size:auto_28rem]";

const bandImages = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202512_uju1mf.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20259_xdcl8g.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202510_a1pxnz.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20253_s06u7f.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448263/HighFashionAudition20251_ufpxud.jpg",
];

const collageImages = [
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202511_rsqv2k.jpg",
    alt: "CFMA 2025 high fashion audition",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202513_zkzinl.jpg",
    alt: "Models on the CFMA 2025 runway",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20258_r7vl6r.jpg",
    alt: "Coast fashion talent at CFMA 2025",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20257_aptp81.jpg",
    alt: "CFMA 2025 awards night audience",
  },
];

const googleCalendarUrl =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  `&text=${encodeURIComponent("Coast Fashion and Modelling Awards 2026 (CFMA 2026)")}` +
  `&dates=${encodeURIComponent("20260815/20260816")}` +
  `&details=${encodeURIComponent(
    "Join CFMA 2026 in Mombasa, Kenya. Theme: Celebrating Heritage, Empowering Youth Talent, and Advancing Sustainable Fashion & Eco-Tourism.\n\nEvent details: https://cmfagency.co.ke/events/upcoming/coast-fashion-modelling-awards-2026"
  )}` +
  `&location=${encodeURIComponent("Mombasa, Kenya")}` +
  `&ctz=${encodeURIComponent("Africa/Nairobi")}`;

const primaryBtn =
  "btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap";
const darkBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-black hover:shadow-xl whitespace-nowrap";
const sponsorBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:bg-primary-700 whitespace-nowrap";

function BandImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-primary-100 sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl">
      <DownloadImage
        src={src}
        alt={alt}
        fill
        quality={65}
        loading="lazy"
        decoding="async"
        className="object-cover object-center"
        sizes={BAND_SIZES}
      />
    </div>
  );
}

export default function CfmaShowcasePage() {
  const { isPortalMember } = usePortal();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
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
    window.location.href = `mailto:info@cmfagency.co.ke?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section
        className="service-showcase-hero w-full bg-white pt-28 sm:pt-32 md:pt-36"
        aria-labelledby="cfma-hero-heading"
      >
        <div className="relative overflow-hidden rounded-tl-[3.5rem] bg-primary-600 sm:rounded-tl-[5.5rem] md:rounded-tl-[7rem] lg:rounded-tl-[9rem]">
          <div className="grid min-h-[360px] grid-cols-1 lg:min-h-[520px] lg:grid-cols-2 xl:min-h-[560px]">
            <div className="relative z-10 flex items-center bg-primary-600 px-6 py-10 sm:px-10 sm:py-14 md:px-14 md:py-16 lg:px-16 lg:py-20 xl:px-20">
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-1/2 -translate-y-[55%] select-none font-montserrat text-[3.5rem] font-bold uppercase leading-none tracking-tight text-white/[0.07] sm:text-[5.5rem] md:text-[7rem] lg:text-[8rem] xl:text-[9.5rem]"
              >
                Awards
              </span>
              <div className="relative w-full max-w-xl">
                <div
                  className="mb-5 h-1.5 w-14 rounded-sm bg-secondary-400 sm:mb-6 sm:h-2 sm:w-16"
                  aria-hidden
                />
                <h1
                  id="cfma-hero-heading"
                  className="!text-left font-montserrat text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.75rem] lg:text-5xl"
                >
                  Coast Fashion and Modelling Awards 2026
                </h1>
                <p className="!text-left mt-4 max-w-md text-sm leading-relaxed text-white/95 sm:mt-5 sm:text-base md:text-lg md:leading-[1.7]">
                  Celebrating heritage, empowering youth talent, and advancing sustainable fashion and eco-tourism.
                </p>
                <p className="!text-left mt-3 text-sm font-semibold text-white/90 sm:text-base">
                  15th August 2026 · Mombasa, Kenya
                </p>
              </div>
            </div>

            <div className="relative min-h-[180px] sm:min-h-[260px] lg:min-h-full">
              <DownloadImage
                src={HERO_SRC}
                alt="Coast Fashion and Modelling Awards 2026 runway"
                fill
                priority
                fetchPriority="high"
                quality={70}
                decoding="async"
                className="object-cover object-center"
                sizes={HERO_SIZES}
              />
              <div className="absolute inset-0 bg-primary-700/25 mix-blend-multiply" aria-hidden />
              <div
                className="absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-r from-primary-600 via-primary-600/70 to-transparent lg:block xl:w-36"
                aria-hidden
              />
              <div
                className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary-600/80 to-transparent sm:h-16 lg:hidden"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="sec-details"
        className="service-showcase-about w-full bg-white py-10 sm:py-14 md:py-16 lg:py-20"
        aria-labelledby="cfma-details"
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-2 w-full lg:order-1 lg:col-span-5">
              <BandImage src={bandImages[0]} alt="CFMA models on the runway in Mombasa" />
            </div>
            <div className="order-1 w-full lg:order-2 lg:col-span-7">
              <Link
                href="/events/upcoming"
                className="mb-4 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to Upcoming Events
              </Link>
              <h2
                id="cfma-details"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Event details
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                <p className="!text-left">
                  The Coast Fashion and Modelling Awards return on 15th August 2026 in Mombasa — a flagship night for
                  coastal heritage, youth talent, and sustainable fashion.
                </p>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm text-gray-800 sm:mt-6 sm:text-base">
                <li className="!text-left flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                  <span>Date: 15th August 2026</span>
                </li>
                <li className="!text-left flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                  <span>Location: Mombasa, Kenya</span>
                </li>
              </ul>
              <p className="!text-left mt-5 text-sm text-gray-800 sm:mt-6 sm:text-base">
                Add it to your calendar{" "}
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-secondary-600 underline underline-offset-2 hover:text-secondary-700"
                >
                  <CalendarPlus className="h-4 w-4" />
                  Google Calendar
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="sec-overview"
        className={`service-showcase-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20 ${belowFoldClass}`}
        aria-labelledby="cfma-overview"
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-1 w-full lg:order-1 lg:col-span-7">
              <h2
                id="cfma-overview"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Event overview
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                <p className="!text-left">
                  CFMA 2026 is a premier creative industry event organized by Changer Fusions, building on the 2025
                  edition which hosted over 350 participants and awarded 30 outstanding contributors in fashion and
                  modelling.
                </p>
                <p className="!text-left">
                  It is a platform for coastal heritage, youth talent, sustainable fashion, and eco-tourism — one of
                  the premier events in Mombasa in 2026. Buy tickets online and join us on 15th August.
                </p>
              </div>
              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/events/upcoming/cmfa-registration" className={primaryBtn}>
                  <Ticket className="h-5 w-5" />
                  CMFA Registration
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <button type="button" onClick={() => setTicketModalOpen(true)} className={darkBtn}>
                  <Ticket className="h-5 w-5" />
                  Buy Ticket Online
                </button>
                <SponsorDropdown buttonClassName={sponsorBtn} menuAlign="left" />
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <a
                  href="/downloads/sponsorship-proposal-2026.pdf"
                  download
                  className="inline-flex items-center gap-1.5 font-medium text-secondary-600 underline underline-offset-2 hover:text-secondary-700"
                >
                  <Download className="h-4 w-4" />
                  Download sponsorship proposal
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-1.5 font-medium text-secondary-600 underline underline-offset-2 hover:text-secondary-700"
                >
                  <Handshake className="h-4 w-4" />
                  Partner with us
                </Link>
                {isPortalMember ? (
                  <Link
                    href="/dashboard/campaigns?type=ticket"
                    className="inline-flex items-center gap-1.5 font-medium text-secondary-600 underline underline-offset-2 hover:text-secondary-700"
                  >
                    <BarChart3 className="h-4 w-4" />
                    View ticket sales
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="order-2 w-full lg:order-2 lg:col-span-5">
              <BandImage src={bandImages[1]} alt="CFMA 2025 high fashion audition" />
            </div>
          </div>
        </div>
      </section>

      <section
        id="sec-why"
        className={`service-showcase-about w-full bg-white py-10 sm:py-14 md:py-16 lg:py-20 ${belowFoldClass}`}
        aria-labelledby="cfma-why"
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-2 w-full lg:order-1 lg:col-span-5">
              <BandImage src={bandImages[2]} alt="Coast fashion talent on stage at CFMA" />
            </div>
            <div className="order-1 w-full lg:order-2 lg:col-span-7">
              <h2
                id="cfma-why"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Why this event matters
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                <p className="!text-left">
                  CFMA is more than a runway. It is how the Coast shows its designers, models, and culture to Kenya
                  and the region.
                </p>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm text-gray-800 sm:mt-6 sm:text-base">
                {[
                  "A platform for youth creatives and emerging talent to showcase their skills",
                  "Preserves and promotes the rich cultural heritage of the Coast",
                  "Advocates for sustainable and eco-friendly fashion practices",
                  "Promotes eco-tourism and responsible destination branding",
                ].map((item) => (
                  <li key={item} className="!text-left flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id="sec-highlights"
        className={`service-showcase-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20 ${belowFoldClass}`}
        aria-labelledby="cfma-highlights"
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-1 w-full lg:order-1 lg:col-span-7">
              <h2
                id="cfma-highlights"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Event highlights
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                <p className="!text-left">
                  A full night of fashion, performance, and recognition — built for designers, models, and audiences
                  who care about the Coast.
                </p>
              </div>
              <ul className="mt-5 space-y-2.5 text-sm text-gray-800 sm:mt-6 sm:text-base">
                {[
                  "Fashion showcases — heritage-inspired and eco-conscious designs",
                  "Modelling competitions — emerging and professional models",
                  "Cultural performances — music, dance, and traditional arts",
                  "Awards ceremony — recognition across 30+ categories",
                  "Eco-tourism exhibitions — coastal destinations and conservation",
                ].map((item) => (
                  <li key={item} className="!text-left flex gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-2 w-full lg:order-2 lg:col-span-5">
              <BandImage src={bandImages[3]} alt="CFMA awards night and fashion showcase" />
            </div>
          </div>
        </div>
      </section>

      <section
        id="sec-gallery"
        className={`service-showcase-about w-full bg-white py-10 sm:py-14 md:py-16 lg:py-20 ${belowFoldClass}`}
        aria-labelledby="cfma-gallery"
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-1 w-full lg:order-1 lg:col-span-6">
              <h2
                id="cfma-gallery"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Gallery from 2025
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                <p className="!text-left">
                  Highlights from the 2025 Coast Fashion and Modelling Awards — talent, heritage, and a packed house.
                </p>
              </div>
            </div>
            <div className="order-2 w-full lg:order-2 lg:col-span-6">
              <div className="mx-auto grid aspect-square w-full max-w-md grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl bg-white sm:max-w-none sm:gap-1.5 sm:rounded-2xl md:aspect-[5/4] lg:rounded-3xl">
                {collageImages.map((image) => (
                  <div key={image.src} className="relative min-h-0 overflow-hidden">
                    <DownloadImage
                      src={image.src}
                      alt={image.alt}
                      fill
                      quality={65}
                      loading="lazy"
                      decoding="async"
                      className="object-cover object-center"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="sec-enquiries"
        className={`service-showcase-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20 ${belowFoldClass}`}
        aria-labelledby="cfma-enquiries"
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-1 w-full lg:order-1 lg:col-span-7">
              <h2
                id="cfma-enquiries"
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                Partnership enquiries
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                <p className="!text-left">
                  Partnership, sponsorship, participation, and general enquiries — tell us how you want to be part of
                  CFMA 2026.
                </p>
              </div>

              {submitted ? (
                <div className="mt-6 rounded-xl border border-secondary-100 bg-white p-5">
                  <p className="!text-left font-semibold text-gray-900">Thanks. Your enquiry is ready to send.</p>
                  <p className="!text-left mt-1 text-gray-700">
                    If your email app did not open, use the{" "}
                    <Link
                      href="/contact"
                      className="font-medium text-secondary-600 underline underline-offset-2 hover:text-secondary-700"
                    >
                      Contact page
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmitEnquiry} className="mt-6 space-y-4">
                  <input
                    value={enquiry.name}
                    onChange={(e) => setEnquiry((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    required
                  />
                  <input
                    value={enquiry.organization}
                    onChange={(e) => setEnquiry((p) => ({ ...p, organization: e.target.value }))}
                    placeholder="Organization"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                  <input
                    type="email"
                    value={enquiry.email}
                    onChange={(e) => setEnquiry((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    required
                  />
                  <textarea
                    value={enquiry.message}
                    onChange={(e) => setEnquiry((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Message / partnership interest"
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    required
                  />
                  <button type="submit" className={`${primaryBtn} w-full sm:w-auto`}>
                    Send enquiry
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </form>
              )}
            </div>
            <div className="order-2 w-full lg:order-2 lg:col-span-5">
              <BandImage src={bandImages[4]} alt="CFMA 2025 audience and production" />
            </div>
          </div>
        </div>
      </section>

      <DownloadDeferredContact />
      <CmfAwardsTicketModal open={ticketModalOpen} onClose={() => setTicketModalOpen(false)} />
    </div>
  );
}
