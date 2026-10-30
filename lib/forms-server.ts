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
};

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
