import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { SEO_SERVICE_FAQ_ITEMS } from "@/lib/seo-service-faq";

const SITE = "https://cmfagency.co.ke";
const PAGE_URL = `${SITE}/services/seo`;

export default function SeoServiceJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#organization`,
        name: "Changer Fusions",
        url: SITE,
        logo: { "@type": "ImageObject", url: BRAND_LOGO_URL },
        address: {
          "@type": "PostalAddress",
          streetAddress: "Ambalal Building, Nkruma Road, Ambalal",
          addressLocality: "Mombasa",
          addressCountry: "KE",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "SEO Services Kenya | Changer Fusions",
        description:
          "Professional SEO in Kenya and Mombasa: technical SEO, on-page optimization, local SEO, content SEO, and transparent monthly packages from KSh 20,000.",
        isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Changer Fusions", publisher: { "@id": `${SITE}/#organization` } },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1778316586/seo_wfek2p.jpg",
        },
        inLanguage: "en-KE",
        breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${PAGE_URL}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
          { "@type": "ListItem", position: 3, name: "SEO Services", item: PAGE_URL },
        ],
      },
      {
        "@type": "Service",
        "@id": `${PAGE_URL}#service`,
        name: "Search Engine Optimization (SEO)",
        serviceType: "SEO — technical, on-page, local, and content",
        description:
          "SEO audits, keyword strategy, on-page optimization, Google Business Profile / local SEO, link building support, analytics, and monthly SEO retainers for businesses in Kenya.",
        provider: { "@id": `${SITE}/#organization` },
        areaServed: [
          { "@type": "Country", name: "Kenya" },
          { "@type": "AdministrativeArea", name: "Mombasa County" },
        ],
        audience: { "@type": "BusinessAudience", audienceType: "Small businesses, enterprises, and agencies in Kenya" },
        offers: {
          "@type": "OfferCatalog",
          name: "Monthly SEO packages",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: "Basic SEO Plan — monthly" },
              price: "20000",
              priceCurrency: "KES",
              description: "Local/regional SEO, keyword research, analytics, on-page basics, reporting.",
            },
            {
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: "Standard SEO Plan — monthly" },
              price: "40000",
              priceCurrency: "KES",
              description: "Competitive keywords, advanced on-site optimization, conversion focus, technical SEO.",
            },
            {
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: "Enterprise SEO — monthly" },
              price: "60000",
              priceCurrency: "KES",
              description: "GBP, enterprise on-site, audits, schema, and advanced technical SEO.",
            },
          ],
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${PAGE_URL}#faq`,
        url: PAGE_URL,
        mainEntity: SEO_SERVICE_FAQ_ITEMS.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
