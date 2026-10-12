import { SITE_URL } from "@/lib/site-url";

const PAGE_URL = `${SITE_URL}/2026-fashion-show`;
const IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_7_kmoxak.jpg";

const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: "2026 Fashion Show | Coast Fashion and Modelling Awards 2026",
      description:
        "Changer Fusions looks back at the Coast Fashion and Modelling Awards 2026, held on 15 August 2026 at City Blue Creekside Hotel, Mombasa.",
      inLanguage: "en-KE",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${PAGE_URL}#event` },
      primaryImageOfPage: IMAGE,
      breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["#fashion-show-heading", ".fashion-night-story p", ".fn-notice p"],
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      isPartOf: { "@id": `${PAGE_URL}#webpage` },
      mainEntity: [
        {
          "@type": "Question",
          name: "What is the 2026 Fashion Show?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The 2026 Fashion Show is the Coast Fashion and Modelling Awards 2026, a flagship night for coastal heritage, youth talent, and sustainable fashion, organized by Changer Fusions.",
          },
        },
        {
          "@type": "Question",
          name: "When and where was the 2026 Fashion Show held?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "It was held on 15 August 2026 at 6:50 PM at City Blue Creekside Hotel, Mombasa, Kenya.",
          },
        },
        {
          "@type": "Question",
          name: "What happened at the Coast Fashion and Modelling Awards 2026?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The night included heritage-inspired and eco-conscious fashion showcases, modelling competitions, cultural performances, an awards ceremony across more than 30 categories, and eco-tourism exhibitions.",
          },
        },
        {
          "@type": "Question",
          name: "Who sponsored the 2026 Fashion Show?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "China Square is shown as a sponsor of the 2026 Fashion Show.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Events", item: `${SITE_URL}/events` },
        { "@type": "ListItem", position: 3, name: "2026 Fashion Show", item: PAGE_URL },
      ],
    },
    {
      "@type": "Event",
      "@id": `${PAGE_URL}#event`,
      name: "Coast Fashion and Modelling Awards 2026",
      alternateName: "2026 Fashion Show",
      description:
        "A flagship night for coastal heritage, youth talent, sustainable fashion, and eco-tourism. Held by Changer Fusions at City Blue Creekside Hotel, Mombasa, on 15 August 2026.",
      startDate: "2026-08-15T18:50:00+03:00",
      endDate: "2026-08-16T00:00:00+03:00",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      image: [IMAGE],
      url: PAGE_URL,
      inLanguage: "en-KE",
      location: {
        "@type": "Place",
        name: "City Blue Creekside Hotel",
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

export default function FashionShowJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
