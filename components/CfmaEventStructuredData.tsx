"use client";

import StructuredData from "./StructuredData";

/**
 * Event JSON-LD schema for CFMA 2026.
 * Helps Google show the event in search results for queries like
 * "events Mombasa 2026", "CMF awards 2026", "buy tickets online Mombasa".
 */
export default function CfmaEventStructuredData() {
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Coast Fashion & Modelling Awards 2026 (CFMA 2026)",
    alternateName: ["CMF Awards 2026", "CFMA 2026"],
    description:
      "Coast Fashion and Modelling Awards 2026 in Mombasa, Kenya. Celebrating heritage, empowering youth talent, and advancing sustainable fashion & eco-tourism. Buy tickets online.",
    startDate: "2026-08-15T18:50:00+03:00",
    endDate: "2026-08-16T02:00:00+03:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Mombasa, Kenya",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Mombasa",
        addressRegion: "Mombasa County",
        addressCountry: "KE",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: -4.0435,
        longitude: 39.6682,
      },
    },
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg",
    organizer: {
      "@type": "Organization",
      name: "Changer Fusions",
      url: "https://cmfagency.co.ke",
    },
    offers: [
      {
        "@type": "Offer",
        name: "Early bird - Regular",
        price: "500",
        priceCurrency: "KES",
        availability: "https://schema.org/InStock",
        url: "https://cmfagency.co.ke/events/upcoming/coast-fashion-modelling-awards-2026",
        validFrom: "2025-01-01",
      },
      {
        "@type": "Offer",
        name: "Early bird - VIP",
        price: "1500",
        priceCurrency: "KES",
        availability: "https://schema.org/InStock",
        url: "https://cmfagency.co.ke/events/upcoming/coast-fashion-modelling-awards-2026",
        validFrom: "2025-01-01",
      },
      {
        "@type": "Offer",
        name: "Early bird - VVIP",
        price: "3500",
        priceCurrency: "KES",
        availability: "https://schema.org/InStock",
        url: "https://cmfagency.co.ke/events/upcoming/coast-fashion-modelling-awards-2026",
        validFrom: "2025-01-01",
      },
    ],
    url: "https://cmfagency.co.ke/events/upcoming/coast-fashion-modelling-awards-2026",
  };

  return <StructuredData data={eventSchema} />;
}
