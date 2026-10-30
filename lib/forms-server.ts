import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import { parseFormFields, type FusionFormField } from "@/lib/fusion-forms";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type FormListingRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  /** Public page for this card. Dashboard forms use /forms/[slug]. */
  href?: string;
};

/** Existing application pages, shown first on /forms before dashboard-created forms. */
export const BUILT_IN_FORM_CARDS: FormListingRow[] = [
  {
    id: "built-in-registration",
    slug: "registration",
    href: "/events/registration",
    title: "Registration",
    excerpt:
      "Apply for Kenya’s Ideal Mr & Miss 2026. Theme: Models for Education. 12 December 2026 at Malaika Lounge, Malindi.",
    category: "Registration",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
    published_at: null,
  },
  {
    id: "built-in-volunteers",
    slug: "volunteers",
    href: "/events/volunteers",
    title: "Volunteers",
    excerpt:
      "Apply to volunteer as a Regional or County Representative for the Kenya Fashion and Creative Arts Awards, organised by Changer Fusions.",
    category: "Volunteer",
    image_url:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202512_uju1mf.jpg",
    published_at: null,
  },
];

export type FormDetailRow = FormListingRow & {
  intro: string | null;
  fields: FusionFormField[];
  updated_at: string | null;
};

export const getPublishedForms = cache(async (): Promise<FormListingRow[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fusion_forms")
    .select("id, slug, title, excerpt, category, image_url, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(60);
  if (error || !data) return [];
  return data as FormListingRow[];
});

export const getPublishedFormBySlug = cache(async (slug: string): Promise<FormDetailRow | null> => {
  if (!slug || !supabase) return null;
  const { data, error } = await supabase
    .from("fusion_forms")
    .select("id, slug, title, excerpt, intro, category, image_url, fields, published_at, updated_at")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Omit<FormDetailRow, "fields"> & { fields: unknown };
  return { ...row, fields: parseFormFields(row.fields) };
});

export async function getPublishedFormsForSitemap(): Promise<
  { slug: string; published_at: string | null; updated_at: string | null }[]
> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fusion_forms")
    .select("slug, published_at, updated_at")
    .not("published_at", "is", null);
  if (error || !data) return [];
  return data as { slug: string; published_at: string | null; updated_at: string | null }[];
}
