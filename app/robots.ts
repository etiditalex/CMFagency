import { MetadataRoute } from "next";

const DISALLOW = [
  "/api/",
  "/admin/",
  "/_next/",
  "/application",
  "/verify-email",
  "/profile",
  "/cart",
  "/events/nominate-model",
  "/events/register-as-model",
  "/events/cmfa-registration",
  "/events/upcoming/cmfa-registration",
  "/nominate-models",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: "Googlebot", allow: "/", disallow: DISALLOW },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW },
    ],
    sitemap: "https://cmfagency.co.ke/sitemap.xml",
    host: "https://cmfagency.co.ke",
  };
}
