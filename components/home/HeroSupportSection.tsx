"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { ChevronUp, ChevronDown } from "lucide-react";

type UpcomingEventItem = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  end_date: string | null;
  venue: string;
  time: string;
  ticket_price_kes: number | null;
  image_url: string | null;
  default_image_url: string | null;
};

const DEFAULT_EVENT_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg";

const CFMA_FALLBACK_EVENT: UpcomingEventItem = {
  id: "cfma-2026-default",
  slug: "coast-fashion-modelling-awards-2026",
  title: "Coast Fashion and Modelling Awards 2026 (CMFA)",
  event_date: "2026-08-15",
  end_date: null,
  venue: "Mombasa, Kenya",
  time: "6:50 PM",
  ticket_price_kes: null,
  image_url:
    "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
  default_image_url: null,
};

function InfoCard({
  title,
  titleClassName,
  lineClassName,
  content,
  buttonText,
  buttonHref,
  buttonClassName,
}: {
  title: string;
  titleClassName: string;
  lineClassName: string;
  content: string;
  buttonText: string;
  buttonHref: string;
  buttonClassName: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-lg border-2 border-gray-300 p-4 sm:p-5 md:p-6">
      <div className="mb-3 flex items-center gap-3 sm:mb-5">
        <h3 className={`shrink-0 text-xs font-extrabold uppercase tracking-[0.12em] sm:text-sm sm:tracking-[0.14em] ${titleClassName}`}>
          {title}
        </h3>
        <span className={`h-0.5 w-full ${lineClassName}`} aria-hidden />
      </div>
      <p className="mb-5 flex-1 text-sm leading-6 text-gray-700 sm:mb-7 sm:leading-7">{content}</p>
      <Link
        href={buttonHref}
        className={`mt-auto inline-flex min-h-[44px] items-center self-start rounded-md px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition-colors sm:px-6 sm:py-3 ${buttonClassName}`}
      >
        {buttonText}
      </Link>
    </article>
  );
}

export default function HeroSupportSection() {
  return (
    <section className="w-full bg-white py-8 sm:py-10 md:py-14" aria-labelledby="home-highlights-heading">
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8">
        <h2 id="home-highlights-heading" className="sr-only">
          Smart management, Fusion Xpress, and upcoming events
        </h2>
        <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-3">
          <InfoCard
            title="Smart Management System"
            titleClassName="text-primary-700"
            lineClassName="bg-primary-500"
            content="Our Smart Management System streamlines how organizations handle visitors, guests, and employees from a single dashboard. It works by capturing pre-registrations and on-arrival check-ins, instantly verifying people, and issuing digital passes - while staff and employees clock in and out with time-stamped check-ins and check-outs at the gate. The gate team monitors entries and exits in real time, and admins get live occupancy, attendance records, automated notifications, and exportable reports - turning everyday visitor and employee management into a fast, secure, and fully trackable workflow."
            buttonText="Explore the System"
            buttonHref="/fusion-xpress/smart-visitor-management"
            buttonClassName="bg-secondary-700 hover:bg-secondary-800"
          />

          <InfoCard
            title="Fusion Xpress"
            titleClassName="text-secondary-700"
            lineClassName="bg-secondary-500"
            content="Fusion Xpress is our platform for ticketing, voting, and campaign delivery. Event organizers, artists, talent brands, and entertainment businesses use it to set up experiences, sell tickets, run paid voting programmes, and manage attendees from one place. Audiences get a simple buy-and-vote flow, while admins control campaigns, coupons, managers, payouts, and email outreach - with dedicated support when you need it. From shows and launches to awards and fan programmes, Fusion Xpress keeps the front-of-house experience smooth and the back-office operations reliable."
            buttonText="Explore Fusion Xpress"
            buttonHref="/fusion-xpress"
            buttonClassName="bg-secondary-700 hover:bg-secondary-800"
          />

          <article className="flex h-full flex-col rounded-lg border-2 border-gray-300 p-4 sm:p-5 md:p-6">
            <div className="mb-3 flex items-center gap-3 sm:mb-5">
              <h3 className="shrink-0 text-xs font-extrabold uppercase tracking-[0.12em] text-primary-700 sm:text-sm sm:tracking-[0.14em]">
                Upcoming Events
              </h3>
              <span className="h-0.5 w-full bg-primary-500" aria-hidden />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <UpcomingEventsList />
            </div>

            <div className="mt-auto pt-4 sm:pt-5">
              <Link
                href="/events/upcoming"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
              >
                View all upcoming events
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function UpcomingEventsList() {
  const [events, setEvents] = useState<UpcomingEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const today = format(new Date(), "yyyy-MM-dd");

    const load = async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date,location,time,ticket_price_kes,image_url,default_image_url")
        .eq("is_live", true)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(20);

      if (!cancelled) {
        if (!error && data) {
          const mapped = data.map((item) => ({
            id: String(item.id ?? ""),
            slug: String(item.slug ?? ""),
            title: String(item.title ?? ""),
            event_date: String(item.event_date ?? ""),
            end_date: item.end_date ? String(item.end_date) : null,
            venue: item.location ? String(item.location) : "Venue to be announced",
            time: item.time ? String(item.time) : "Time to be announced",
            ticket_price_kes:
              typeof item.ticket_price_kes === "number" ? item.ticket_price_kes : null,
            image_url: item.image_url ? String(item.image_url) : null,
            default_image_url: item.default_image_url ? String(item.default_image_url) : null,
          })) as UpcomingEventItem[];
          const hasCfmaInDb = mapped.some(
            (event) => event.slug === "coast-fashion-modelling-awards-2026"
          );
          const mergedEvents = hasCfmaInDb ? mapped : [CFMA_FALLBACK_EVENT, ...mapped];
          mergedEvents.sort((a, b) => a.event_date.localeCompare(b.event_date));
          setEvents(mergedEvents);
        }
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[9.5rem] flex-1 items-center justify-center rounded-md border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-600">Loading upcoming events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex min-h-[9.5rem] flex-1 items-center rounded-md border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">No upcoming events published yet.</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            listRef.current?.scrollBy({ top: -120, behavior: "smooth" });
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-primary-700 transition-colors hover:bg-gray-50"
          aria-label="Scroll events up"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            listRef.current?.scrollBy({ top: 120, behavior: "smooth" });
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-primary-700 transition-colors hover:bg-gray-50"
          aria-label="Scroll events down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={listRef}
        role="list"
        aria-label="Upcoming events"
        className="hero-upcoming-events-scroll min-h-[9.5rem] flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-color:theme(colors.primary.300)_theme(colors.gray.100)] [scrollbar-width:thin]"
      >
      {events.map((event) => {
        const eventDate = event.event_date ? new Date(event.event_date) : null;
        const endDate = event.end_date ? new Date(event.end_date) : null;
        const dateLabel = eventDate
          ? `${format(eventDate, "MMM d, yyyy")}${endDate ? ` - ${format(endDate, "MMM d, yyyy")}` : ""}`
          : "Date to be announced";
        const image = event.image_url || event.default_image_url || DEFAULT_EVENT_IMAGE;
        const href = event.slug ? `/events/upcoming/${event.slug}` : "/events/upcoming";

        return (
          <Link
            key={event.id}
            href={href}
            role="listitem"
            className="flex gap-3 rounded-md p-2 transition-colors hover:bg-gray-50"
          >
            <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-sm bg-gray-100">
              <Image src={image} alt={event.title} fill className="object-cover" sizes="96px" />
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 text-xs font-semibold text-gray-900">{dateLabel}</p>
              <p className="line-clamp-1 text-xs uppercase tracking-wide text-gray-700">{event.venue}</p>
              <p className="line-clamp-1 text-xs text-gray-600">{event.time}</p>
              <p className="text-sm font-semibold text-secondary-700">
                {event.ticket_price_kes && event.ticket_price_kes > 0
                  ? `Starts at: KES ${event.ticket_price_kes.toLocaleString("en-KE")}`
                  : "Registration details on event page"}
              </p>
            </div>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
