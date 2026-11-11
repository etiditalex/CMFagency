import Calendar2028Sheet from "@/components/calendar-2028/Calendar2028Sheet";
import { FALLBACK_CALENDAR_STOPS } from "@/lib/award-calendar";
import { getPublishedCalendarStops } from "@/lib/award-calendar-server";

export default async function EventsPage() {
  const { stops, fromDatabase } = await getPublishedCalendarStops();
  const sheetStops = fromDatabase ? stops : FALLBACK_CALENDAR_STOPS;
  return (
    <article>
      <Calendar2028Sheet stops={sheetStops} headingId="events-calendar-heading" siteChrome />
    </article>
  );
}
