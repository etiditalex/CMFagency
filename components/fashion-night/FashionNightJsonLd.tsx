import { SITE_URL } from "@/lib/site-url";

const PAGE_URL = `${SITE_URL}/2025-fashion-night`;
const IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg";

const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: "2025 Fashion Night | Coast Fashion and Modelling Awards 2025",
      description:
        "Changer Fusions looks back at the Coast Fashion and Modelling Awards 2025, the first coast awards night, held on 15 May 2025 in Mombasa, Coast Region, Kenya.",
      inLanguage: "en-KE",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${PAGE_URL}#event` },
      primaryImageOfPage: IMAGE,
      breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Events", item: `${SITE_URL}/events` },
        { "@type": "ListItem", position: 3, name: "2025 Fashion Night", item: PAGE_URL },
      ],
    },
    {
      "@type": "Event",
      "@id": `${PAGE_URL}#event`,
      name: "Coast Fashion and Modelling Awards 2025",
      alternateName: "2025 Fashion Night",
      description:
        "The first Coast Fashion and Modelling Awards. A contestant awards night and fashion showcase on 15 May 2025 in the Coast Region, Kenya, celebrating coast talent, heritage, and modelling.",
      startDate: "2025-05-15",
      endDate: "2025-05-15",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      image: [IMAGE],
      url: PAGE_URL,
      inLanguage: "en-KE",
      location: {
        "@type": "Place",
        name: "Coast Region, Kenya",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mombasa",
          addressRegion: "Coast",
          addressCountry: "KE",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: -4.0435,
          longitude: 39.6682,
        },
      },
      organizer: {
        "@type": "Organization",
        name: "Changer Fusions",
        url: SITE_URL,
      },
      offers: [
        { "@type": "Offer", name: "Regular", price: "500", priceCurrency: "KES", url: PAGE_URL },
        { "@type": "Offer", name: "VIP", price: "1500", priceCurrency: "KES", url: PAGE_URL },
        { "@type": "Offer", name: "VVIP", price: "3500", priceCurrency: "KES", url: PAGE_URL },
      ],
    },
  ],
};

export default function FashionNightJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
