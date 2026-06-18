import { SITE_URL } from "@/lib/site-url";
import { CFMA_TICKET_LOCATIONS } from "@/lib/cfma-ticket-locations";

const canonical = `${SITE_URL}/kcm/cfm-tickets`;

/**
 * JSON-LD graph for `/kcm/cfm-tickets`: WebPage, BreadcrumbList, FAQPage, ItemList (ticket offers).
 * Keeps FAQ content aligned with on-page trust signals for organic search.
 */
export const cfmTicketsJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: "Buy CFM Tickets Kenya | Coast Fashion & Modelling Awards (CFMA) 2026",
      description:
        "Official CFM / CFMA tickets for the Coast Fashion & Modelling Awards in Kenya: Regular, VIP and VVIP tiers. Pay with M-Pesa STK, Paystack (card), or Lipa Pole Pole installments. Serving fans in Mombasa, Kilifi, Kwale, Voi and Nairobi.",
      inLanguage: "en-KE",
      isPartOf: {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "Changer Fusions",
        url: SITE_URL,
      },
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
          name: "CFM Tickets",
          item: canonical,
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Can I buy CFM tickets from Kilifi, Kwale, Voi or Nairobi?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Changer Fusions sells official CFM Awards and coast fashion tickets online for fans across Kenya — including Mombasa, Kilifi, Kwale, Voi and Nairobi. Checkout at https://cmfagency.co.ke/kcm/cfm-tickets with M-Pesa, Paystack or Lipa Pole Pole.",
          },
        },
        {
          "@type": "Question",
          name: "What are the CFM ticket prices for Coast Fashion & Modelling Awards?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "CFM Tickets packages are KES 500 (Regular), KES 1,500 (VIP), and KES 3,500 (VVIP) on the official checkout.",
          },
        },
        {
          "@type": "Question",
          name: "How do I pay for CFM tickets in Kenya?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can pay with M-Pesa (STK push to your Safaricom number), or with Visa, Mastercard and mobile money via Paystack. Lipa Pole Pole lets you pay in installments until your tickets are fully paid.",
          },
        },
        {
          "@type": "Question",
          name: "What is Lipa Pole Pole for CFM tickets?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Lipa Pole Pole is an installment option: you choose your ticket tier, make a first payment, then top up until the total for your package is paid. Tickets are fulfilled when the plan is fully paid.",
          },
        },
        {
          "@type": "Question",
          name: "What is included in the KES 500 Regular CFM ticket?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The KES 500 Regular package includes entry for one guest, general seating, and an event wristband.",
          },
        },
        {
          "@type": "Question",
          name: "What is included in the KES 1,500 VIP CFM ticket?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The KES 1,500 VIP package includes priority entry, a reserved seating zone, and a complimentary refreshment.",
          },
        },
        {
          "@type": "Question",
          name: "What is included in the KES 3,500 VVIP CFM ticket?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The KES 3,500 VVIP package includes a front-row experience, VIP lounge access, and a meet and greet opportunity.",
          },
        },
      ],
    },
    {
      "@type": "ItemList",
      name: "CFM ticket pages by location",
      itemListElement: CFMA_TICKET_LOCATIONS.map((loc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "WebPage",
          name: `CFM tickets ${loc.name}`,
          url: `${SITE_URL}/events/tickets/${loc.slug}`,
        },
      })),
    },
    {
      "@type": "ItemList",
      name: "CFM ticket tiers",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "Product",
            name: "CFM Regular Ticket — Coast Fashion & Modelling Awards",
            description: "Entry for one guest, general seating, event wristband.",
            offers: {
              "@type": "Offer",
              price: "500",
              priceCurrency: "KES",
              availability: "https://schema.org/InStock",
              url: canonical,
            },
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "Product",
            name: "CFM VIP Ticket — Coast Fashion & Modelling Awards",
            description: "Priority entry, reserved seating zone, complimentary refreshment.",
            offers: {
              "@type": "Offer",
              price: "1500",
              priceCurrency: "KES",
              availability: "https://schema.org/InStock",
              url: canonical,
            },
          },
        },
        {
          "@type": "ListItem",
          position: 3,
          item: {
            "@type": "Product",
            name: "CFM VVIP Ticket — Coast Fashion & Modelling Awards",
            description: "Front-row experience, VIP lounge access, meet & greet opportunity.",
            offers: {
              "@type": "Offer",
              price: "3500",
              priceCurrency: "KES",
              availability: "https://schema.org/InStock",
              url: canonical,
            },
          },
        },
      ],
    },
  ],
} as const;
