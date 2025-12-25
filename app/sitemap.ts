import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://changerfusions.com";

  const routes = [
    "",
    "/about",
    "/services",
    "/services/digital-marketing",
    "/services/website-development",
    "/services/branding",
    "/services/market-research",
    "/services/events-marketing",
    "/services/content-creation",
    "/events",
    "/testimonials",
    "/portfolios",
    "/contact",
    "/jobs",
    "/talent",
    "/merchandise",
    "/training",
    "/career",
    "/marketing-fusion",
    "/privacy",
    "/terms",
    "/cookies",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route.startsWith("/services") ? 0.9 : 0.8,
  }));
}

