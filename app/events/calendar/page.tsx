import type { Metadata } from "next";
import EventsCalendar from "@/components/events/EventsCalendar";
import { EVENTS_BANNER_OG } from "@/lib/og-images";

export const metadata: Metadata = {
  title: "Events Calendar | Changer Fusions",
  description:
    "Browse Changer Fusions events by month, week, or day. Open any event for details and tickets. Staff manage dates in the Fusion Xpress dashboard.",
  openGraph: {
    title: "Events Calendar | Changer Fusions",
    description: "Browse our events calendar and click through to tickets and details.",
    url: "https://cmfagency.co.ke/events/calendar",
    siteName: "Changer Fusions",
    images: [{ url: EVENTS_BANNER_OG.url, width: EVENTS_BANNER_OG.width, height: EVENTS_BANNER_OG.height, alt: EVENTS_BANNER_OG.alt }],
  },
  alternates: {
    canonical: "https://cmfagency.co.ke/events/calendar",
  },
};

export default function EventsCalendarPage() {
  return <EventsCalendar />;
}
