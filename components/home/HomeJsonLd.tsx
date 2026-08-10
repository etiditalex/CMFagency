const PAGE_URL = "https://cmfagency.co.ke";
const OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${PAGE_URL}/#website`,
    url: PAGE_URL,
    name: "Changer Fusions",
    alternateName: ["CMF Agency", "Changer Fusions Marketing Agency"],
    description:
      "Marketing agency in Ambalal, Mombasa offering digital marketing, website development, branding, events, and career development across Kenya.",
    inLanguage: "en-KE",
    publisher: { "@id": `${PAGE_URL}/#organization` },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${PAGE_URL}/#organization`,
    name: "Changer Fusions",
    legalName: "Changer Fusions",
    url: PAGE_URL,
    logo: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1774528895/changer_logo_mynoa2.png",
    image: OG_IMAGE,
    email: "info@cmfagency.co.ke",
    telephone: "+254797777347",
    slogan: "Market to thrive, Market to exist",
    sameAs: [],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Ambalal Building, Nkruma Road",
      addressLocality: "Mombasa",
      addressRegion: "Mombasa County",
      addressCountry: "KE",
    },
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+254797777347",
        contactType: "customer service",
        areaServed: "KE",
        availableLanguage: ["English", "Swahili"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${PAGE_URL}/#localbusiness`,
    name: "Changer Fusions",
    image: OG_IMAGE,
    url: PAGE_URL,
    telephone: "+254797777347",
    email: "info@cmfagency.co.ke",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Ambalal Building, Nkruma Road, Ambalal",
      addressLocality: "Mombasa",
      addressRegion: "Mombasa County",
      addressCountry: "KE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -4.0435,
      longitude: 39.6682,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "17:00",
      },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Marketing and growth services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Digital marketing" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Website development" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Branding" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Event management" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Career development" } },
      ],
    },
  },
];

/** Server-rendered JSON-LD for search engines (not shown in the page UI). */
export default function HomeJsonLd() {
  return (
    <>
      {schemas.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
