import { SITE_URL } from "@/lib/site-url";

export type CfmaTicketLocation = {
  slug: string;
  name: string;
  county: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  travelNote: string;
  intro: string;
  /** Nearby towns or areas mentioned for long-tail local search. */
  nearbyAreas: string[];
};

const CHECKOUT_URL = `${SITE_URL}/kcm/cfm-tickets`;
const EVENT_URL = `${SITE_URL}/events/upcoming/coast-fashion-modelling-awards-2026`;

export const CFMA_TICKET_LOCATIONS: CfmaTicketLocation[] = [
  {
    slug: "mombasa",
    name: "Mombasa",
    county: "Mombasa County",
    headline: "CFM Awards tickets in Mombasa",
    metaTitle: "CFM Awards Tickets Mombasa | Coast Fashion Tickets | Changer Fusions",
    metaDescription:
      "Buy official CFM Awards tickets and Coast Fashion & Modelling Awards (CFMA) 2026 tickets in Mombasa. Secure checkout via M-Pesa or card from Changer Fusions. Regular from KES 500.",
    keywords: [
      "CFM Awards tickets Mombasa",
      "Coast fashion tickets Mombasa",
      "Changer Fusions tickets Mombasa",
      "CFMA tickets Mombasa",
      "event tickets Mombasa 2026",
      "fashion awards tickets Kenya coast",
    ],
    travelNote:
      "The 2026 awards take place at City Blue Creekside Hotel, Mombasa on 15 August 2026. Local guests enjoy the shortest travel time and can collect wristbands on event day.",
    intro:
      "Mombasa is home to the Coast Fashion & Modelling Awards (CFMA) — Kenya's premier coast fashion celebration. Whether you live in Nyali, Bamburi, Likoni or Mombasa Island, buy official CFM tickets online from Changer Fusions with M-Pesa STK, Paystack, or Lipa Pole Pole installments.",
    nearbyAreas: ["Nyali", "Bamburi", "Likoni", "Mombasa Island", "Kisauni"],
  },
  {
    slug: "kilifi",
    name: "Kilifi",
    county: "Kilifi County",
    headline: "CFM Awards tickets from Kilifi",
    metaTitle: "CFM Awards Tickets Kilifi | Coast Fashion Tickets Kenya | Changer Fusions",
    metaDescription:
      "Buy CFM Awards and Coast Fashion & Modelling Awards tickets from Kilifi County. Official online checkout for fans in Kilifi, Malindi, Watamu and the north coast. M-Pesa & card accepted.",
    keywords: [
      "CFM tickets Kilifi",
      "Coast fashion tickets Kilifi",
      "Changer Fusions tickets Kilifi",
      "CFMA tickets Malindi",
      "event tickets north coast Kenya",
      "fashion awards tickets Kilifi",
    ],
    travelNote:
      "From Kilifi town or Malindi, plan a scenic coastal drive or SGR connection to Mombasa for the 15 August 2026 gala at City Blue Creekside Hotel.",
    intro:
      "Fans across Kilifi County — from Kilifi town and Mtwapa to Malindi and Watamu — can secure Coast Fashion & Modelling Awards tickets online before they sell out. Changer Fusions is the official ticketing partner for CFM Awards 2026.",
    nearbyAreas: ["Malindi", "Watamu", "Mtwapa", "Kilifi town", "Mariakani"],
  },
  {
    slug: "kwale",
    name: "Kwale",
    county: "Kwale County",
    headline: "CFM Awards tickets from Kwale & Diani",
    metaTitle: "CFM Awards Tickets Kwale | Coast Fashion Tickets Diani | Changer Fusions",
    metaDescription:
      "Official CFM Awards and coast fashion tickets for Kwale County. Buy CFMA 2026 tickets online from Diani, Ukunda, Msambweni and south coast Kenya. M-Pesa, Paystack & Lipa Pole Pole.",
    keywords: [
      "CFM tickets Kwale",
      "Coast fashion tickets Diani",
      "Changer Fusions tickets Kwale",
      "CFMA tickets Ukunda",
      "south coast event tickets Kenya",
      "fashion awards tickets Kwale",
    ],
    travelNote:
      "South coast guests in Diani, Ukunda or Msambweni can reach Mombasa in roughly 1–2 hours by road for the 15 August 2026 awards night.",
    intro:
      "Kwale County fashion lovers and hospitality guests along Diani Beach can purchase official CFM / CFMA tickets without visiting a physical desk. Complete secure checkout from Changer Fusions and receive confirmation for the Coast Fashion & Modelling Awards in Mombasa.",
    nearbyAreas: ["Diani", "Ukunda", "Msambweni", "Lungalunga", "Shimoni"],
  },
  {
    slug: "voi",
    name: "Voi",
    county: "Taita-Taveta County",
    headline: "CFM Awards tickets from Voi & Taita-Taveta",
    metaTitle: "CFM Awards Tickets Voi | Coast Fashion Tickets Taita-Taveta | Changer Fusions",
    metaDescription:
      "Buy CFM Awards and Coast Fashion & Modelling Awards tickets from Voi and Taita-Taveta County. Official online tickets for the 2026 Mombasa gala — M-Pesa, card and installment plans.",
    keywords: [
      "CFM tickets Voi",
      "Coast fashion tickets Voi",
      "Changer Fusions tickets Taita Taveta",
      "CFMA tickets Voi Kenya",
      "event tickets Voi to Mombasa",
      "fashion awards tickets coast Kenya",
    ],
    travelNote:
      "From Voi, connect via the Nairobi–Mombasa highway or SGR to Mombasa for the 15 August 2026 Coast Fashion & Modelling Awards.",
    intro:
      "Voi and the wider Taita-Taveta region are part of Kenya's coast-to-highlands corridor. Reserve CFM Awards tickets early online — Changer Fusions supports M-Pesa STK, Paystack cards, and Lipa Pole Pole for fans travelling to Mombasa.",
    nearbyAreas: ["Wundanyi", "Taveta", "Mwatate", "Maungu"],
  },
  {
    slug: "nairobi",
    name: "Nairobi",
    county: "Nairobi County",
    headline: "CFM Awards tickets from Nairobi",
    metaTitle: "CFM Awards Tickets Nairobi | Coast Fashion Tickets Kenya | Changer Fusions",
    metaDescription:
      "Buy CFM Awards and Coast Fashion & Modelling Awards 2026 tickets from Nairobi. Official online checkout for capital-city guests attending the Mombasa gala. M-Pesa, Paystack & Lipa Pole Pole.",
    keywords: [
      "CFM Awards tickets Nairobi",
      "Coast fashion tickets Nairobi",
      "Changer Fusions tickets Nairobi",
      "CFMA tickets Nairobi to Mombasa",
      "fashion awards tickets Kenya",
      "buy event tickets Nairobi Kenya",
    ],
    travelNote:
      "Nairobi guests can fly or take SGR to Mombasa for the 15 August 2026 awards. Book CFM tickets in advance so your seat is confirmed before travel.",
    intro:
      "Nairobi fashion enthusiasts, models, sponsors and diaspora visitors can buy official Coast Fashion & Modelling Awards tickets online from Changer Fusions — the same secure checkout used on the Kenya coast. Pay with M-Pesa, card, or spread cost with Lipa Pole Pole.",
    nearbyAreas: ["Westlands", "Karen", "CBD", "Eastlands", "Kiambu corridor"],
  },
];

export const CFMA_TICKET_LOCATION_BY_SLUG = Object.fromEntries(
  CFMA_TICKET_LOCATIONS.map((loc) => [loc.slug, loc])
) as Record<string, CfmaTicketLocation>;

export function cfmaTicketLocationPath(slug: string): string {
  return `/events/tickets/${slug}`;
}

export { CHECKOUT_URL, EVENT_URL };
