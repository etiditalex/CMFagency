import { SITE_URL } from "@/lib/site-url";

const canonical = `${SITE_URL}/kcm/cfm-tickets`;
const posterImage = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg";

/** Shared FAQ copy — keep in sync with the visible FAQ on the page (Google FAQ rich results). */
export const cfmTicketsFaqs = [
  {
    question: "Where can I buy CFM Awards / Coast Fashion Awards tickets?",
    answer:
      "Buy official CFM Awards and Coast Fashion Awards tickets online at https://cmfagency.co.ke/kcm/cfm-tickets. This is the official CFM tickets checkout for the Coast Fashion & Modelling Awards 2026.",
  },
  {
    question: "What are CFM tickets for Coast Fashion Awards?",
    answer:
      "CFM tickets are official entry packages for the Coast Fashion & Modelling Awards (CFM Awards / CFMA) 2026 in Mombasa. Choose Regular (KES 500), VIP (KES 1,500), or VVIP (KES 3,500) and pay with M-Pesa or card.",
  },
  {
    question: "What are the CFM ticket prices for Coast Fashion & Modelling Awards?",
    answer:
      "CFM ticket packages are KES 500 (Regular), KES 1,500 (VIP), and KES 3,500 (VVIP). Buy at https://cmfagency.co.ke/kcm/cfm-tickets.",
  },
  {
    question: "How do I pay for CFM tickets in Kenya?",
    answer:
      "Pay with M-Pesa (STK push to your Safaricom number) or with Visa, Mastercard and mobile money via Paystack on https://cmfagency.co.ke/kcm/cfm-tickets.",
  },
  {
    question: "When and where is the Coast Fashion Awards / CFM Awards 2026?",
    answer:
      "Coast Fashion & Modelling Awards 2026 (CFM Awards) is at City Blue Creekside Hotel, Mombasa on 15 August 2026 from 7:00 PM. Get tickets at https://cmfagency.co.ke/kcm/cfm-tickets.",
  },
] as const;

const ticketBrand = {
  "@type": "Brand",
  name: "Changer Fusions",
} as const;

const ticketProducts = [
  {
    "@type": "Product",
    "@id": `${canonical}#product-regular`,
    name: "CFM Regular Ticket — Coast Fashion Awards",
    description: "Entry for one guest, general seating, event wristband.",
    image: [posterImage],
    sku: "cfm-regular-2026",
    brand: ticketBrand,
    category: "Event tickets",
    offers: {
      "@type": "Offer",
      url: canonical,
      price: "500",
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: "2026-08-15",
      seller: {
        "@type": "Organization",
        name: "Changer Fusions",
        url: SITE_URL,
      },
    },
  },
  {
    "@type": "Product",
    "@id": `${canonical}#product-vip`,
    name: "CFM VIP Ticket — Coast Fashion Awards",
    description: "Priority entry, reserved seating zone, complimentary refreshment.",
    image: [posterImage],
    sku: "cfm-vip-2026",
    brand: ticketBrand,
    category: "Event tickets",
    offers: {
      "@type": "Offer",
      url: canonical,
      price: "1500",
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: "2026-08-15",
      seller: {
        "@type": "Organization",
        name: "Changer Fusions",
        url: SITE_URL,
      },
    },
  },
  {
    "@type": "Product",
    "@id": `${canonical}#product-vvip`,
    name: "CFM VVIP Ticket — Coast Fashion Awards",
    description: "Front-row experience, VIP lounge access, meet & greet opportunity.",
    image: [posterImage],
    sku: "cfm-vvip-2026",
    brand: ticketBrand,
    category: "Event tickets",
    offers: {
      "@type": "Offer",
      url: canonical,
      price: "3500",
      priceCurrency: "KES",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: "2026-08-15",
      seller: {
        "@type": "Organization",
        name: "Changer Fusions",
        url: SITE_URL,
      },
    },
  },
] as const;

/**
 * JSON-LD graph for `/kcm/cfm-tickets`: WebPage, Event (+ offers), BreadcrumbList, FAQPage, Product offers.
 */
export const cfmTicketsJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: "CFM Awards Tickets | Coast Fashion Awards 2026",
      description:
        "Buy official CFM Awards and Coast Fashion Awards tickets online. CFM tickets for Coast Fashion & Modelling Awards 2026 — Regular, VIP and VVIP. Pay with M-Pesa or card at https://cmfagency.co.ke/kcm/cfm-tickets.",
      inLanguage: "en-KE",
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: posterImage,
      },
      isPartOf: {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Changer Fusions",
        url: SITE_URL,
      },
      about: {
        "@id": `${canonical}#event`,
      },
    },
    {
      "@type": "Event",
      "@id": `${canonical}#event`,
      name: "Coast Fashion & Modelling Awards 2026",
      alternateName: [
        "CFM Awards",
        "CFM Awards 2026",
        "Coast Fashion Awards",
        "Coast Fashion Awards 2026",
        "CFMA 2026",
      ],
      description:
        "Official CFM Awards / Coast Fashion Awards 2026 in Mombasa. Buy CFM tickets for Coast Fashion & Modelling Awards online — Regular, VIP and VVIP packages.",
      startDate: "2026-08-15T19:00:00+03:00",
      endDate: "2026-08-16T02:00:00+03:00",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      image: [posterImage],
      url: canonical,
      location: {
        "@type": "Place",
        name: "City Blue Creekside Hotel, Mombasa",
        address: {
          "@type": "PostalAddress",
          streetAddress: "City Blue Creekside Hotel",
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
      organizer: {
        "@type": "Organization",
        name: "Changer Fusions",
        url: SITE_URL,
      },
      performer: {
        "@type": "Organization",
        name: "Coast Fashion & Modelling Awards",
      },
      offers: [
        {
          "@type": "Offer",
          name: "CFM Regular Ticket",
          category: "Primary",
          price: "500",
          priceCurrency: "KES",
          availability: "https://schema.org/InStock",
          url: canonical,
          validFrom: "2025-01-01",
        },
        {
          "@type": "Offer",
          name: "CFM VIP Ticket",
          category: "Primary",
          price: "1500",
          priceCurrency: "KES",
          availability: "https://schema.org/InStock",
          url: canonical,
          validFrom: "2025-01-01",
        },
        {
          "@type": "Offer",
          name: "CFM VVIP Ticket",
          category: "Primary",
          price: "3500",
          priceCurrency: "KES",
          availability: "https://schema.org/InStock",
          url: canonical,
          validFrom: "2025-01-01",
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Kenya Coast Models",
          item: `${SITE_URL}/kcm`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "CFM Awards Tickets",
          item: canonical,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: cfmTicketsFaqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    // Standalone Product nodes so Google Product rich results get required `image` / `brand`.
    ...ticketProducts,
    {
      "@type": "ItemList",
      name: "CFM ticket tiers — Coast Fashion Awards",
      itemListElement: ticketProducts.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: { "@id": product["@id"] },
      })),
    },
  ],
} as const;
