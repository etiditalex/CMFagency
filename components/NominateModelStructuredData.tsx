const PAGE_URL = "https://cmfagency.co.ke/events/nominate-model";
const HERO_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1776166126/models2_zb5yfj.jpg";

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}#webpage`,
    url: PAGE_URL,
    name: "Nominate a Model for Coast Fashion & Modelling Awards 2026",
    description:
      "Nominate Top 10 Male and Top 10 Female Models for CFMA 2026 in Mombasa, Kenya. Online nominations for the Coast Fashion & Modelling Awards.",
    inLanguage: "en-KE",
    isPartOf: {
      "@type": "WebSite",
      name: "Changer Fusions | CMF Agency",
      url: "https://cmfagency.co.ke",
    },
    about: {
      "@type": "Event",
      name: "Coast Fashion & Modelling Awards 2026",
      startDate: "2026-08-15T19:00:00+03:00",
      location: {
        "@type": "Place",
        name: "City Blue Creekside Hotel",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Mombasa",
          addressRegion: "Mombasa County",
          addressCountry: "KE",
        },
      },
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: HERO_IMAGE,
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://cmfagency.co.ke",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Events",
        item: "https://cmfagency.co.ke/events",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Upcoming Events",
        item: "https://cmfagency.co.ke/events/upcoming",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Nominate a Model",
        item: PAGE_URL,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I nominate a model for CFMA 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Visit the Nominate Model page on cmfagency.co.ke, click Nominate Now, and submit the online form with your details and the nominee’s information for Top 10 Male Models or Top 10 Female Models.",
        },
      },
      {
        "@type": "Question",
        name: "Can I nominate myself for the Coast Fashion & Modelling Awards?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Someone else must nominate you. Self-nominations are not accepted for Top 10 Male and Top 10 Female Models.",
        },
      },
      {
        "@type": "Question",
        name: "When and where is CFMA 2026?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The Coast Fashion & Modelling Awards 2026 take place on Saturday 15th August 2026 at City Blue Creekside Hotel, Mombasa, from 7PM till late.",
        },
      },
      {
        "@type": "Question",
        name: "What categories can I nominate models for?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "You can nominate for Top 10 Male Models and Top 10 Female Models. Shortlisted talent will be recognized and certified on event day.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Coast Fashion & Modelling Awards 2026 — Model Nominations",
    description:
      "Nominate Top 10 Male and Top 10 Female Models for the Coast Fashion & Modelling Awards 2026 in Mombasa, Kenya.",
    startDate: "2026-08-15T19:00:00+03:00",
    endDate: "2026-08-16T02:00:00+03:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [HERO_IMAGE],
    location: {
      "@type": "Place",
      name: "City Blue Creekside Hotel",
      address: {
        "@type": "PostalAddress",
        streetAddress: "City Blue Creekside Hotel",
        addressLocality: "Mombasa",
        addressRegion: "Mombasa County",
        addressCountry: "KE",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Changer Fusions",
      alternateName: "CMF Agency",
      url: "https://cmfagency.co.ke",
      telephone: "+254797777347",
    },
    offers: {
      "@type": "Offer",
      name: "Model nomination (free)",
      price: "0",
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
      url: PAGE_URL,
      validFrom: "2026-01-01",
    },
    url: PAGE_URL,
  },
];

/** Server-rendered JSON-LD for Google (in initial HTML). */
export default function NominateModelStructuredData() {
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
