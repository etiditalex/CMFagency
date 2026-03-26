import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  author: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
  external_links?: { label: string; url: string }[] | null;
};

/** Cached server-side fetch for a single published blog by slug. Dedupes when used in generateMetadata + page. */
export const getBlogBySlug = cache(async (slug: string): Promise<BlogPostRow | null> => {
  if (!slug || !supabase) return null;
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("id, slug, title, excerpt, body, author, category, image_url, published_at, external_links")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) return null;
  return data as BlogPostRow | null;
});

export type BlogTrendingRow = { slug: string; title: string };

export type BlogSidebarAdRow = {
  id: string;
  title: string;
  image_url: string | null;
  href: string | null;
};

/** Other recent posts for the blog article sidebar (excludes current slug). */
export const getBlogTrendingExcluding = cache(async (excludeSlug: string, limit = 6): Promise<BlogTrendingRow[]> => {
  if (!supabase || !excludeSlug) return [];
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("slug, title")
    .neq("slug", excludeSlug)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as BlogTrendingRow[];
});

/** Approved sidebar promos (RLS returns only approved rows). */
export const getApprovedBlogSidebarAds = cache(async (): Promise<BlogSidebarAdRow[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fusion_blog_sidebar_ads")
    .select("id, title, image_url, href")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as BlogSidebarAdRow[];
});

/** Published posts for /blogs listing (no body — smaller payload). */
export type BlogListingRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
};

/** Server-only index data: cached, parallel fetch (faster than client double round-trip). */
export const getBlogIndexData = cache(
  async (): Promise<{
    posts: BlogListingRow[];
    sidebarAds: BlogSidebarAdRow[];
    trending: BlogTrendingRow[];
  }> => {
    if (!supabase) return { posts: [], sidebarAds: [], trending: [] };
    const [postsRes, adsRes] = await Promise.all([
      supabase
        .from("fusion_blogs")
        .select("id, slug, title, excerpt, author, category, image_url, published_at")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false }),
      supabase
        .from("fusion_blog_sidebar_ads")
        .select("id, title, image_url, href")
        .order("sort_order", { ascending: true }),
    ]);

    const posts =
      !postsRes.error && postsRes.data ? (postsRes.data as BlogListingRow[]) : [];
    const sidebarAds =
      !adsRes.error && adsRes.data ? (adsRes.data as BlogSidebarAdRow[]) : [];
    const trending = posts.slice(0, 6).map(({ slug, title }) => ({ slug, title }));

    return { posts, sidebarAds, trending };
  }
);
