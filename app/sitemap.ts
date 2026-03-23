import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPublishedJobListings } from "@/lib/job-board-listings";
import { SITE_URL } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const now = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/services", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/services/digital-marketing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/website-development", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/branding", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/market-research", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/events-marketing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/services/content-creation", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/events", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/events/upcoming", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/events/upcoming/coast-fashion-modelling-awards-2026", priority: 0.95, changeFrequency: "weekly" as const },
    { path: "/events/past", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/testimonials", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/portfolios", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/contact", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/jobs", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/jobs/apply", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/talent", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/training", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/career", priority: 0.8, changeFrequency: "monthly" as const },
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

  return [...staticEntries, ...jobEntries];
}

