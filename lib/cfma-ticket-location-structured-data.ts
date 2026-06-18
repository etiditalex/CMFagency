import type { CfmaTicketLocation } from "@/lib/cfma-ticket-locations";
import { CHECKOUT_URL, EVENT_URL } from "@/lib/cfma-ticket-locations";
import { SITE_URL } from "@/lib/site-url";

export function cfmaTicketLocationJsonLd(loc: CfmaTicketLocation) {
  const pageUrl = `${SITE_URL}/events/tickets/${loc.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: loc.metaTitle,
        description: loc.metaDescription,
        inLanguage: "en-KE",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          name: "Changer Fusions",
          url: SITE_URL,
        },
        about: {
          "@type": "Event",
          name: "Coast Fashion & Modelling Awards 2026 (CFMA)",
          url: EVENT_URL,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Events", item: `${SITE_URL}/events/upcoming` },
          { "@type": "ListItem", position: 3, name: `CFM tickets ${loc.name}`, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Can I buy CFM Awards tickets from ${loc.name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Yes. Fans in ${loc.county} can buy official CFM Awards and coast fashion tickets online at ${CHECKOUT_URL}. Pay with M-Pesa, Paystack, or Lipa Pole Pole installments from Changer Fusions.`,
            },
          },
          {
            "@type": "Question",
            name: `Where is the Coast Fashion & Modelling Awards 2026 for ${loc.name} guests?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `The gala is in Mombasa at City Blue Creekside Hotel on 15 August 2026. ${loc.travelNote}`,
            },
          },
        ],
      },
      {
        "@type": "Event",
        name: "Coast Fashion & Modelling Awards 2026 (CFMA)",
        description:
          "Kenya's premier coast fashion and modelling awards. Official tickets from Changer Fusions — CFM Awards tickets, coast fashion tickets, M-Pesa and card checkout.",
        startDate: "2026-08-15T18:50:00+03:00",
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: "City Blue Creekside Hotel, Mombasa",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Mombasa",
            addressRegion: "Mombasa County",
            addressCountry: "KE",
          },
        },
        audience: {
          "@type": "Audience",
          audienceType: `Fashion event guests from ${loc.name}`,
          geographicArea: {
            "@type": "AdministrativeArea",
            name: loc.county,
          },
        },
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "500",
          highPrice: "3500",
          priceCurrency: "KES",
          availability: "https://schema.org/InStock",
          url: CHECKOUT_URL,
        },
        organizer: {
          "@type": "Organization",
          name: "Changer Fusions",
          url: SITE_URL,
        },
      },
    ],
  };
}
