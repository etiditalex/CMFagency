"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, LayoutDashboard } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ViewMode = "month" | "week" | "day";

type EventRow = {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  end_date: string | null;
};

const CFMA_2026: EventRow = {
  id: "cfma-2026-default",
  slug: "coast-fashion-modelling-awards-2026",
  title: "Coast Fashion and Modelling Awards 2026 (CMFA)",
  event_date: "2026-08-15",
  end_date: null,
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function eventDetailHref(eventDate: string, slug: string): string {
  const today = format(new Date(), "yyyy-MM-dd");
  return eventDate >= today ? `/events/upcoming/${slug}` : `/events/past/${slug}`;
}

/** Dates (yyyy-MM-dd) an event occupies from event_date through end_date inclusive. */
function eventSpanDates(e: EventRow): string[] {
  const start = e.event_date;
  const end = e.end_date && e.end_date >= start ? e.end_date : start;
  const out: string[] = [];
  let d = new Date(start + "T12:00:00");
  const endD = new Date(end + "T12:00:00");
  while (d <= endD) {
    out.push(format(d, "yyyy-MM-dd"));
    d = addDays(d, 1);
  }
  return out;
}

function eventsForDay(events: EventRow[], day: Date): EventRow[] {
  const key = format(day, "yyyy-MM-dd");
  return events.filter((e) => eventSpanDates(e).includes(key));
}

export default function EventsCalendar() {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("fusion_events")
        .select("id,slug,title,event_date,end_date")
        .order("event_date", { ascending: true });
      if (cancelled) return;
      const rows = (error ? [] : (data ?? [])) as EventRow[];
      const hasCfma = rows.some((e) => e.slug === "coast-fashion-modelling-awards-2026");
      const merged = hasCfma ? rows : [...rows, CFMA_2026].sort((a, b) => a.event_date.localeCompare(b.event_date));
      setEvents(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthLabel = format(cursor, "MMMM yyyy");

  const goToday = () => setCursor(new Date());

  const goPrev = () => {
    if (view === "month") setCursor((d) => subMonths(d, 1));
    else if (view === "week") setCursor((d) => subWeeks(d, 1));
    else setCursor((d) => addDays(d, -1));
  };

  const goNext = () => {
    if (view === "month") setCursor((d) => addMonths(d, 1));
    else if (view === "week") setCursor((d) => addWeeks(d, 1));
    else setCursor((d) => addDays(d, 1));
  };

  const monthGridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [cursor]);

  const weekRangeLabel = `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`;

  const centerTitle =
    view === "month" ? monthLabel : view === "week" ? weekRangeLabel : format(cursor, "EEEE, MMMM d, yyyy");

  return (
    <div className="min-h-screen bg-gray-100 pb-16 pt-28 sm:pt-32 md:pt-36">
      <div className="container-custom max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Events calendar — click an event to open details and tickets
            </h1>
          </div>
          <Link
            href="/dashboard/events"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 shadow-sm transition-colors hover:bg-primary-50"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Manage events (dashboard)
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-l-md border border-primary-600 bg-primary-600 px-3 py-2 text-white hover:bg-primary-700"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="border border-l-0 border-primary-600 bg-primary-600 px-3 py-2 text-white hover:bg-primary-700"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={goToday}
                className="rounded-md border border-primary-500 bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600"
              >
                today
              </button>
            </div>

            <h2 className="text-center text-lg font-bold text-gray-900 sm:text-xl md:flex-1">{centerTitle}</h2>

            <div className="flex justify-center sm:justify-end">
              <div className="inline-flex rounded-md shadow-sm">
                {(["month", "week", "day"] as const).map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`border border-primary-600 px-3 py-2 text-sm font-semibold capitalize sm:px-4 ${
                      i === 0 ? "rounded-l-md" : ""
                    } ${i === 2 ? "rounded-r-md" : ""} ${
                      view === v ? "bg-primary-600 text-white" : "bg-white text-primary-700 hover:bg-primary-50"
                    } ${i > 0 ? "border-l-0" : ""}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-20 text-gray-600">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              <p className="mt-4 text-sm">Loading events…</p>
            </div>
          ) : view === "month" ? (
            <div className="p-2 sm:p-4">
              <div className="grid grid-cols-7 border-b border-gray-200 bg-primary-600/95 text-center">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2 text-xs font-bold uppercase tracking-wide text-white sm:text-sm">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 border-l border-t border-gray-200">
                {monthGridDays.map((day) => {
                  const inMonth = isSameMonth(day, cursor);
                  const dayEvents = eventsForDay(events, day);
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[88px] border-b border-r border-gray-200 p-1 sm:min-h-[100px] sm:p-1.5 ${
                        !inMonth ? "bg-gray-50/80" : "bg-white"
                      }`}
                    >
                      <div
                        className={`mb-1 text-right text-xs font-semibold sm:text-sm ${
                          inMonth ? "text-primary-700" : "text-gray-400"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {dayEvents.map((e) => (
                          <Link
                            key={`${e.id}-${format(day, "yyyy-MM-dd")}`}
                            href={eventDetailHref(e.event_date, e.slug)}
                            className="block truncate rounded bg-primary-600 px-1 py-0.5 text-[10px] font-semibold text-white hover:bg-primary-700 sm:text-xs"
                            title={e.title}
                          >
                            {e.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === "week" ? (
            <div className="p-2 sm:p-4">
              <div className="grid grid-cols-7 gap-px border border-gray-200 bg-gray-200">
                {weekDays.map((day) => {
                  const dayEvents = eventsForDay(events, day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className={`min-h-[200px] bg-white p-2 ${isToday ? "ring-2 ring-primary-400 ring-inset" : ""}`}>
                      <div className="border-b border-gray-100 pb-1 text-center text-xs font-bold text-primary-700 sm:text-sm">
                        <div>{format(day, "EEE")}</div>
                        <div className="text-lg text-gray-900">{format(day, "d")}</div>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {dayEvents.map((e) => (
                          <li key={`${e.id}-${format(day, "yyyy-MM-dd")}`}>
                            <Link
                              href={eventDetailHref(e.event_date, e.slug)}
                              className="block rounded bg-primary-600 px-1.5 py-1 text-[11px] font-semibold leading-tight text-white hover:bg-primary-700 sm:text-xs"
                            >
                              {e.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <ul className="space-y-3">
                {eventsForDay(events, cursor).length === 0 ? (
                  <li className="text-gray-500">No events on this day.</li>
                ) : (
                  eventsForDay(events, cursor).map((e) => (
                    <li key={e.id}>
                      <Link
                        href={eventDetailHref(e.event_date, e.slug)}
                        className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                      >
                        {e.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
