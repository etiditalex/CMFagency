import { CALENDAR_LOGO } from "@/components/calendar-2028/calendar-2028-data";
import { type AwardCalendarStop, calendarParts } from "@/lib/award-calendar";
import { SITE_URL } from "@/lib/site-url";

const PAGE_URL = `${SITE_URL}/2028-calendar`;

export default function Calendar2028JsonLd({ stops }: { stops: AwardCalendarStop[] }) {
  const yearStops = stops.filter((stop) => calendarParts(stop.eventDate).year === 2028);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: "2028 Calendar",
        description:
          "2028 Calendar lists host dates for Kenya Fashion and Creative Arts Awards.",
        inLanguage: "en-KE",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        primaryImageOfPage: CALENDAR_LOGO,
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["#calendar-2028-heading", ".calendar-2028 table"],
        },
      },
      {
        "@type": "ItemList",
        "@id": `${PAGE_URL}#dates`,
        name: "2028 Calendar",
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: yearStops.length,
        itemListElement: yearStops.map((stop, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Event",
            name: stop.host,
            startDate: stop.eventDate,
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
