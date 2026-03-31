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
  /** Set when row exists; used for sitemaps, JSON-LD dateModified, and OG article freshness. */
  updated_at: string | null;
  external_links?: { label: string; url: string }[] | null;
};

/** All published slugs — for `generateStaticParams` so article pages can be prerendered at build. */
export async function getPublishedBlogSlugsForStatic(): Promise<{ slug: string }[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("slug")
    .not("published_at", "is", null);
  if (error || !data) return [];
  return data.map((r: { slug: string }) => ({ slug: r.slug }));
}

/** Cached server-side fetch for a single published blog by slug. Dedupes when used in generateMetadata + page. */
export const getBlogBySlug = cache(async (slug: string): Promise<BlogPostRow | null> => {
  if (!slug || !supabase) return null;
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("id, slug, title, excerpt, body, author, category, image_url, published_at, updated_at, external_links")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();
  if (error) return null;
  return data as BlogPostRow | null;
});

export type BlogTrendingRow = { slug: string; title: string };

/** News & Business stories for the editorial "Columns" sidebar block. */
export type BlogColumnSidebarRow = {
  slug: string;
  title: string;
  image_url: string | null;
  published_at: string | null;
  category: string | null;
};

const COLUMN_SIDEBAR_CATEGORIES = ["News", "Business"] as const;

/** Published News/Business posts for article sidebar; optionally exclude the current article. */
export const getBlogColumnsSidebarPosts = cache(
  async (excludeSlug?: string, limit = 5): Promise<BlogColumnSidebarRow[]> => {
    if (!supabase) return [];
    let q = supabase
      .from("fusion_blogs")
      .select("slug, title, image_url, published_at, category")
      .not("published_at", "is", null)
      .in("category", [...COLUMN_SIDEBAR_CATEGORIES])
      .order("published_at", { ascending: false })
      .limit(limit);
    if (excludeSlug) q = q.neq("slug", excludeSlug);
    const { data, error } = await q;
    if (error || !data) return [];
    return data as BlogColumnSidebarRow[];
  }
);

export type BlogRelatedCard = {
  slug: string;
  title: string;
  image_url: string | null;
  published_at: string | null;
};

/** Resolve published posts for :::related blocks (order matches requested slugs; skips missing). */
export const getBlogRelatedCardsBySlugs = cache(async (slugs: string[]): Promise<BlogRelatedCard[]> => {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!supabase || unique.length === 0) return [];
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("slug, title, image_url, published_at")
    .in("slug", unique)
    .not("published_at", "is", null);
  if (error || !data) return [];
  const bySlug = new Map((data as BlogRelatedCard[]).map((r) => [r.slug, r]));
  return unique.flatMap((s) => {
    const row = bySlug.get(s);
    return row ? [row] : [];
  });
});

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

/** Cap listing grid payload; trending/columns use separate small queries so older News/Business posts still appear in sidebars. */
export const BLOG_LISTING_PAGE_SIZE = 150;

/** Keeps `unstable_cache` payload under Next.js ~2MB data cache limit; cards only show a short preview. */
const LISTING_EXCERPT_MAX_CHARS = 400;

function trimListingExcerpt(post: BlogListingRow): BlogListingRow {
  const ex = post.excerpt;
  if (ex == null || ex.length <= LISTING_EXCERPT_MAX_CHARS) return post;
  return {
    ...post,
    excerpt: `${ex.slice(0, LISTING_EXCERPT_MAX_CHARS).trimEnd()}…`,
  };
}

async function loadBlogIndexData(): Promise<{
  posts: BlogListingRow[];
  sidebarAds: BlogSidebarAdRow[];
  trending: BlogTrendingRow[];
  columnPosts: BlogColumnSidebarRow[];
  listingTruncated: boolean;
}> {
  if (!supabase) {
    return { posts: [], sidebarAds: [], trending: [], columnPosts: [], listingTruncated: false };
  }

  const [postsRes, trendingRes, adsRes, columnPosts] = await Promise.all([
    supabase
      .from("fusion_blogs")
      .select("id, slug, title, excerpt, author, category, image_url, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(BLOG_LISTING_PAGE_SIZE + 1),
    supabase
      .from("fusion_blogs")
      .select("slug, title")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("fusion_blog_sidebar_ads")
      .select("id, title, image_url, href")
      .order("sort_order", { ascending: true }),
    getBlogColumnsSidebarPosts(undefined, 5),
  ]);

  const rawPosts =
    !postsRes.error && postsRes.data ? (postsRes.data as BlogListingRow[]) : [];
  const listingTruncated = rawPosts.length > BLOG_LISTING_PAGE_SIZE;
  const capped = listingTruncated ? rawPosts.slice(0, BLOG_LISTING_PAGE_SIZE) : rawPosts;
  const posts = capped.map(trimListingExcerpt);

  const sidebarAds =
    !adsRes.error && adsRes.data ? (adsRes.data as BlogSidebarAdRow[]) : [];
  const trending =
    !trendingRes.error && trendingRes.data ? (trendingRes.data as BlogTrendingRow[]) : [];

  return { posts, sidebarAds, trending, columnPosts, listingTruncated };
}

/**
 * Server-only index data: parallel bounded queries. Deduped per request with React `cache()`.
 * Cross-request caching uses `/blogs` ISR (`export const revalidate = 60`); `unstable_cache` is not used here because
 * large excerpt HTML can exceed Next.js’s ~2MB data cache limit.
 */
export const getBlogIndexData = cache(loadBlogIndexData);

export type BlogSitemapRow = { slug: string; published_at: string; updated_at: string | null };

/** Latest meaningful modification time for SEO (sitemap lastmod, article modified, JSON-LD). */
export function blogLastModifiedDate(publishedAt: string | null, updatedAt: string | null): Date | undefined {
  if (!publishedAt) return undefined;
  const pub = new Date(publishedAt).getTime();
  const upd = updatedAt ? new Date(updatedAt).getTime() : pub;
  return new Date(Math.max(pub, upd));
}

/** Published posts for sitemap URLs and lastmod (SEO / crawlers). */
export async function getPublishedBlogsForSitemap(limit = 500): Promise<BlogSitemapRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("slug, published_at, updated_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as BlogSitemapRow[];
}

export type BlogFeedRow = { slug: string; title: string; excerpt: string | null; published_at: string };

/** Recent published posts for RSS (discovery / aggregators). */
export async function getPublishedBlogsForFeed(limit = 50): Promise<BlogFeedRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("fusion_blogs")
    .select("slug, title, excerpt, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as BlogFeedRow[];
}
