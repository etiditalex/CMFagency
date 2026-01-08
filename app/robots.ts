import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/application",
          "/login",
          "/verify-email",
          "/profile",
          "/cart",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/application",
          "/login",
          "/verify-email",
          "/profile",
          "/cart",
        ],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/application",
          "/login",
          "/verify-email",
          "/profile",
          "/cart",
        ],
      },
    ],
    sitemap: "https://changerfusions.com/sitemap.xml",
    host: "https://changerfusions.com",
  };
}

