"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Ticket,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import CmfAwardsTicketModal from "@/components/CmfAwardsTicketModalLazy";
import CfmaShowcasePage from "@/components/events/cfma/CfmaShowcasePage";
import { resolveFusionModalTicketTier } from "@/lib/fusion-general-admission-tier";
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
  is_live?: boolean | null;
};

const FLASH_SALE_SLUG = "coast-fashion-and-modelling-awards-2026-flash-sale";

function salesClosedMessage(slug: string): string {
  if (slug === FLASH_SALE_SLUG) return "Flash sale closed for now";
  return "Ticket sales closed for now";
}

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


function DbUpcomingEventDetail({ event }: { event: DbEvent }) {
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [modalTiersOverride, setModalTiersOverride] = useState<TicketTierRow[] | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(event.event_date);
  const imgUrl = event.image_url || event.default_image_url || "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg";
  const objectPosition = (event.image_focus as string | null) || "center center";
  const eventDate = new Date(event.event_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const salesOpen = event.is_live !== false;
  const closedMsg = salesClosedMessage(event.slug);
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
    if (!salesOpen) return;
    setModalTiersOverride(null);
    setTicketModalOpen(true);
  };

  const openGeneralCheckout = async () => {
    if (!salesOpen) return;
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
    salesOpen &&
    ((hasTieredTickets && tiersForModal.length > 0) ||
      inlineGeneralTiers != null ||
      modalTiersOverride != null);

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

                {!salesOpen && (
                  <div
                    className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
                    role="status"
                  >
                    <p className="font-extrabold text-sm sm:text-base">{closedMsg}</p>
                    <p className="mt-1 text-xs sm:text-sm text-amber-900/90">
                      This page is still available. Online checkout will open again when sales resume.
                    </p>
                  </div>
                )}

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
                        disabled={!salesOpen}
                        className="w-full text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:hover:bg-white disabled:cursor-not-allowed p-3 sm:p-4 shadow-sm"
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
                        disabled={!salesOpen || buyLoading}
                        className="w-full text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60 disabled:hover:bg-white disabled:cursor-not-allowed p-3 sm:p-4 shadow-sm"
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
                        <div className="mt-2 text-sm text-gray-600">
                          {salesOpen
                            ? "Pay in full or use Lipa Pole Pole in checkout."
                            : closedMsg}
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm sm:text-base">
                  {hasFreeReg &&
                    (salesOpen ? (
                      <Link
                        href={`/events/register/${event.slug}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 transition-colors"
                      >
                        <Ticket className="w-5 h-5" />
                        Register
                      </Link>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-200 text-gray-600 font-semibold py-3 px-4 cursor-not-allowed sm:col-span-2">
                        {closedMsg}
                      </span>
                    ))}
                  {hasTieredTickets && !hasFreeReg && (
                    <button
                      type="button"
                      onClick={() => openTieredCheckout()}
                      disabled={!salesOpen}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 transition-colors"
                    >
                      <Ticket className="w-5 h-5" />
                      {salesOpen ? "Buy Ticket Online" : closedMsg}
                    </button>
                  )}
                  {hasTicket && !hasFreeReg && !hasTieredTickets && (
                    <button
                      type="button"
                      disabled={!salesOpen || buyLoading}
                      onClick={() => void openGeneralCheckout()}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 hover:bg-black disabled:bg-gray-300 disabled:hover:bg-gray-300 disabled:opacity-100 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 transition-colors"
                    >
                      {buyLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                      ) : (
                        <Ticket className="w-5 h-5 shrink-0" />
                      )}
                      {!salesOpen
                        ? closedMsg
                        : buyLoading
                          ? "Opening checkout…"
                          : "Buy Ticket Online"}
                    </button>
                  )}
                  {hasPayment && !hasFreeReg && salesOpen && (
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
        .select("id,slug,title,event_date,end_date,location,time,description,full_description,image_url,default_image_url,ticket_campaign_slug,ticket_price_kes,ticket_tiers,payment_link,document_url,document_label,map_url,gallery,image_focus,free_registration,lipa_pole_pole,is_live")
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
    return <CfmaShowcasePage />;
  }

  if (hardcodedEvent) {
    return <GenericUpcomingEventDetail event={hardcodedEvent} />;
  }

  if (dbEvent) {
    return <DbUpcomingEventDetail event={dbEvent} />;
  }

  return null;
}
