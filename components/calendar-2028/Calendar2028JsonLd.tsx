import { CALENDAR_LOGO, CALENDAR_STOPS } from "@/components/calendar-2028/calendar-2028-data";
import { SITE_URL } from "@/lib/site-url";

const PAGE_URL = `${SITE_URL}/2028-calendar`;

const data = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: "2028 Calendar",
      description:
        "2028 Calendar lists host dates for Kenya Fashion and Creative Arts Awards, from Coast — Kilifi on 29 April 2028 through Nyanza — Kisumu on 25 November 2028.",
      inLanguage: "en-KE",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      primaryImageOfPage: CALENDAR_LOGO,
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["#calendar-2028-heading", ".calendar-2028 table"],
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      isPartOf: { "@id": `${PAGE_URL}#webpage` },
      mainEntity: [
        {
          "@type": "Question",
          name: "What does the 2028 Calendar list?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "The 2028 Calendar lists eight host dates with a region and county: Coast — Kilifi, North Eastern — Garissa, Eastern — Embu, Western — Kakamega, Central — Nyeri, Rift Valley — Nakuru, Nairobi Metropolitan — Nairobi, and Nyanza — Kisumu.",
          },
        },
        {
          "@type": "Question",
          name: "When is the Coast host date in 2028?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Coast — Kilifi is listed on 29 April 2028.",
          },
        },
        {
          "@type": "Question",
          name: "When is the Nairobi host date in 2028?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nairobi Metropolitan — Nairobi is listed on 28 October 2028.",
          },
        },
        {
          "@type": "Question",
          name: "Which host date is last on the 2028 Calendar?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nyanza — Kisumu is listed on 25 November 2028.",
          },
        },
      ],
    },
    {
      "@type": "ItemList",
      "@id": `${PAGE_URL}#dates`,
      name: "2028 Calendar",
      itemListOrder: "https://schema.org/ItemListOrderAscending",
      numberOfItems: CALENDAR_STOPS.length,
      itemListElement: CALENDAR_STOPS.map((stop, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Event",
          name: stop.host,
          startDate: stop.date,
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: stop.host,
            address: {
              "@type": "PostalAddress",
              addressCountry: "KE",
            },
          },
          organizer: {
            "@type": "Organization",
            name: "Changer Fusions",
            url: SITE_URL,
          },
        },
      })),
    },
  ],
};

export default function Calendar2028JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
