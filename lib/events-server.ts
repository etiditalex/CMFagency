import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type UpcomingEventRow = {
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
};

/** Cached server-side fetch for an upcoming event by slug (for metadata / JSON-LD). */
export const getUpcomingEventBySlug = cache(
  async (slug: string): Promise<UpcomingEventRow | null> => {
    if (!slug || !supabase) return null;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("fusion_events")
      .select("id, slug, title, event_date, end_date, location, time, description, full_description, image_url, default_image_url")
      .eq("slug", slug)
      .gte("event_date", today)
      .maybeSingle();
    if (error) return null;
    return data as UpcomingEventRow | null;
  }
);

export type PastEventRow = {
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
  gallery: string[] | null;
};

/** Cached server-side fetch for a past event by slug (for metadata / share previews). */
export const getPastEventBySlug = cache(
  async (slug: string): Promise<PastEventRow | null> => {
    if (!slug || !supabase) return null;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("fusion_events")
      .select(
        "id, slug, title, event_date, end_date, location, time, description, full_description, image_url, default_image_url, gallery"
      )
      .eq("slug", slug)
      .lt("event_date", today)
      .maybeSingle();
    if (error) return null;
    return data as PastEventRow | null;
  }
);
