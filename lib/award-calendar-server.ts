import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import { type AwardCalendarStop, FALLBACK_CALENDAR_STOPS } from "@/lib/award-calendar";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type StopRow = {
  id: string;
  event_date: string;
  host: string;
  note: string | null;
  published: boolean;
};

function mapStop(row: StopRow): AwardCalendarStop {
  return {
    id: row.id,
    eventDate: String(row.event_date).slice(0, 10),
    host: row.host,
    note: row.note,
    published: row.published,
  };
}

/** Published dates for the public calendar. Falls back to the 2028 sheet until the table exists. */
export const getPublishedCalendarStops = cache(async (): Promise<{ stops: AwardCalendarStop[]; fromDatabase: boolean }> => {
  if (!supabase) return { stops: FALLBACK_CALENDAR_STOPS, fromDatabase: false };
  try {
    const { data, error } = await supabase
      .from("award_calendar_stops")
      .select("id, event_date, host, note, published")
      .eq("published", true)
      .order("event_date", { ascending: true })
      .abortSignal(AbortSignal.timeout(2500));
    if (error || !data) return { stops: FALLBACK_CALENDAR_STOPS, fromDatabase: false };
    return { stops: (data as StopRow[]).map(mapStop), fromDatabase: true };
  } catch {
    return { stops: FALLBACK_CALENDAR_STOPS, fromDatabase: false };
  }
});
