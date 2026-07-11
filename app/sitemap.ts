import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { blogLastModifiedDate, getPublishedBlogsForSitemap } from "@/lib/blog-server";
import { CFMA_TICKET_LOCATIONS } from "@/lib/cfma-ticket-locations";
import { getPublishedJobListings } from "@/lib/job-board-listings";
import { SITE_URL } from "@/lib/site-url";

/** Do not run multi-query Supabase work during `next build` (Vercel 60s prerender limit). */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/about/team", priority: 0.92, changeFrequency: "monthly" as const },
    { path: "/about/partners", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/services", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/services/digital-marketing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/social-media-marketing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/website-development", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/branding", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/market-research", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/events-marketing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/content-creation", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/seo", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/events", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/events/upcoming", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/events/upcoming/coast-fashion-modelling-awards-2026", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/events/past", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/events/register-as-model", priority: 0.93, changeFrequency: "weekly" as const },
    { path: "/events/nominate-model", priority: 0.96, changeFrequency: "daily" as const },
    { path: "/nominate-models", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/events/upcoming/cmfa-registration", priority: 0.94, changeFrequency: "weekly" as const },
    { path: "/testimonials", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/portfolios", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/contact", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/jobs", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/jobs/apply", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/talent", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/training", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/career", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/kcm", priority: 0.94, changeFrequency: "weekly" as const },
    { path: "/kcm/cfm-tickets", priority: 0.98, changeFrequency: "daily" as const },
    { path: "/fusion-xpress", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/fusion-xpress/fx-qr-code-generator", priority: 0.98, changeFrequency: "daily" as const },
    { path: "/research", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/application", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/careers", priority: 0.82, changeFrequency: "weekly" as const },
    { path: "/marketing-fusion", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/blogs", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/cookies", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  const staticEntries = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const ticketLocationEntries: MetadataRoute.Sitemap = CFMA_TICKET_LOCATIONS.map((loc) => ({
    url: `${baseUrl}/events/tickets/${loc.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.92,
  }));

  const jobEntries: MetadataRoute.Sitemap = [];

  try {
    const { listings } = await getPublishedJobListings();
    for (const l of listings) {
      jobEntries.push({
        url: `${baseUrl}/jobs/${l.id}`,
        lastModified: l.published_at ? new Date(l.published_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.78,
      });
    }
  } catch {
    // Supabase or table missing during build — skip dynamic job URLs
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data } = await supabase.from("aggregated_jobs").select("id, updated_at").limit(250);
      for (const row of data ?? []) {
        const r = row as { id: string; updated_at?: string | null };
        if (!r.id) continue;
        jobEntries.push({
          url: `${baseUrl}/jobs/external/${r.id}`,
          lastModified: r.updated_at ? new Date(r.updated_at) : now,
          changeFrequency: "daily" as const,
          priority: 0.7,
        });
      }
    }
  } catch {
    // aggregated_jobs may not exist yet
  }

  const blogEntries: MetadataRoute.Sitemap = [];
  try {
    const blogRows = await getPublishedBlogsForSitemap();
    for (const row of blogRows) {
      if (!row.slug || !row.published_at) continue;
      const lastMod = blogLastModifiedDate(row.published_at, row.updated_at) ?? now;
      blogEntries.push({
        url: `${baseUrl}/blogs/${row.slug}`,
        lastModified: lastMod,
        changeFrequency: "weekly" as const,
        priority: 0.84,
      });
    }
  } catch {
    // Supabase unavailable during build
  }

  return [...staticEntries, ...ticketLocationEntries, ...jobEntries, ...blogEntries];
}

