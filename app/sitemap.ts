import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://cmfagency.co.ke";
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
    { path: "/events/past", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/testimonials", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/portfolios", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/contact", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/jobs", priority: 0.85, changeFrequency: "weekly" as const },
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

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

