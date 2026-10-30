import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import { parseFormFields, STARTER_FORMS, starterFormBySlug, type FusionFormField } from "@/lib/fusion-forms";

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

const LISTING_COLUMNS = "id, slug, title, excerpt, category, image_url, published_at, link_href";

function cardHref(slug: string, linkHref: string | null | undefined): string {
  const saved = linkHref?.trim();
  if (saved?.startsWith("/")) return saved;
  return starterFormBySlug(slug)?.linkHref || `/forms/${slug}`;
}

function toListingRow(row: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  link_href?: string | null;
}): FormListingRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    image_url: row.image_url,
    published_at: row.published_at,
    href: cardHref(row.slug, row.link_href),
  };
}

function staticStarterCard(form: (typeof STARTER_FORMS)[number]): FormListingRow {
  return {
    id: `built-in-${form.slug}`,
    slug: form.slug,
    title: form.title,
    excerpt: form.excerpt,
    category: form.category,
    image_url: form.imageUrl,
    published_at: null,
    href: form.linkHref,
  };
}

export type FormDetailRow = FormListingRow & {
  intro: string | null;
  fields: FusionFormField[];
  updated_at: string | null;
};

async function selectFormRows(columns: string, onlyPublished: boolean) {
  if (!supabase) return { rows: [] as FormListingRow[], unavailable: true };
  let query = supabase.from("fusion_forms").select(columns).order("published_at", { ascending: false }).limit(60);
  if (onlyPublished) query = query.not("published_at", "is", null);
  const first = await query;
  if (!first.error) {
    return {
      rows: ((first.data ?? []) as unknown as Parameters<typeof toListingRow>[0][]).map(toListingRow),
      unavailable: false,
    };
  }
  if (!first.error.message.includes("link_href")) return { rows: [], unavailable: true };
  let fallback = supabase
    .from("fusion_forms")
    .select("id, slug, title, excerpt, category, image_url, published_at")
    .order("published_at", { ascending: false })
    .limit(60);
  if (onlyPublished) fallback = fallback.not("published_at", "is", null);
  const second = await fallback;
  if (second.error || !second.data) return { rows: [], unavailable: true };
  return {
    rows: (second.data as unknown as Parameters<typeof toListingRow>[0][]).map(toListingRow),
    unavailable: false,
  };
}

/** Published forms for the public grid. Registration and Volunteers stay first, using dashboard edits when saved. */
export const listPublicForms = cache(async (): Promise<FormListingRow[]> => {
  const published = await selectFormRows(LISTING_COLUMNS, true);
  const known = await selectFormRows(LISTING_COLUMNS, false);
  const publishedBySlug = new Map(published.rows.map((row) => [row.slug, row]));
  const knownSlugs = new Set(known.rows.map((row) => row.slug));
  const pinned = STARTER_FORMS.flatMap((starter) => {
    const saved = publishedBySlug.get(starter.slug);
    if (saved) return [saved];
    if (known.unavailable || !knownSlugs.has(starter.slug)) return [staticStarterCard(starter)];
    return [];
  });
  const pinnedSlugs = new Set<string>(STARTER_FORMS.map((form) => form.slug));
  const rest = published.rows.filter((row) => !pinnedSlugs.has(row.slug));
  return [...pinned, ...rest];
});

export const getPublishedForms = cache(async (): Promise<FormListingRow[]> => {
  const published = await selectFormRows(LISTING_COLUMNS, true);
  return published.rows;
});

export const getPublishedFormBySlug = cache(async (slug: string): Promise<FormDetailRow | null> => {
  if (!slug || !supabase) return null;
  const { data, error } = await supabase
    .from("fusion_forms")
    .select("id, slug, title, excerpt, intro, category, image_url, fields, published_at, updated_at, link_href")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error?.message.includes("link_href")) {
    const fallback = await supabase
      .from("fusion_forms")
      .select("id, slug, title, excerpt, intro, category, image_url, fields, published_at, updated_at")
      .eq("slug", slug)
      .not("published_at", "is", null)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    const row = fallback.data as Omit<FormDetailRow, "fields" | "href"> & { fields: unknown };
    return { ...row, href: cardHref(row.slug, null), fields: parseFormFields(row.fields) };
  }
  if (error || !data) return null;
  const row = data as Omit<FormDetailRow, "fields" | "href"> & { fields: unknown; link_href?: string | null };
  return { ...row, href: cardHref(row.slug, row.link_href), fields: parseFormFields(row.fields) };
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
