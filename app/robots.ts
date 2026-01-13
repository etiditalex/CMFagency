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
          "/verify-email",
          "/profile",
          "/cart",
        ],
      },
    ],
    sitemap: "https://cmfagency.co.ke/sitemap.xml",
    host: "https://cmfagency.co.ke",
  };
}

