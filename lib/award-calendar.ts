import { CALENDAR_STOPS } from "@/components/calendar-2028/calendar-2028-data";

export type AwardCalendarStop = {
  id: string;
  eventDate: string;
  host: string;
  note: string | null;
  published: boolean;
};

export const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const FALLBACK_CALENDAR_STOPS: AwardCalendarStop[] = CALENDAR_STOPS.map((stop) => ({
  id: `fallback-${stop.date}`,
  eventDate: stop.date,
  host: stop.host,
  note: null,
  published: true,
}));

export function calendarParts(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-");
  const monthIndex = Number(month) - 1;
  const monthName = CALENDAR_MONTHS[monthIndex] ?? "";
  const dayNumber = String(Number(day));
  return {
    year: Number(year),
    month: monthName,
    day: dayNumber,
    iso: `${year}-${month}-${day}`,
    label: `${dayNumber} ${monthName} ${year}`,
  };
}

export function calendarYears(stops: AwardCalendarStop[]) {
  return [...new Set(stops.map((stop) => calendarParts(stop.eventDate).year))].sort((a, b) => a - b);
}
