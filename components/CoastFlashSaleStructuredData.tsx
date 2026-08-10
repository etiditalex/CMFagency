const PAGE_URL =
  "https://cmfagency.co.ke/events/upcoming/coast-fashion-and-modelling-awards-2026-flash-sale";
const IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768551251/CFMA_qxfe0m.jpg";

/**
 * SEO-only JSON-LD for the Coast Fashion flash sale page.
 * Not rendered as visible UI — crawlers only.
 */
export default function CoastFlashSaleStructuredData() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: "Coast Fashion Flash Sale Tickets | Coast Event Flash Sale",
      description:
        "Coast fashion flash sale tickets for Coast Fashion and Modelling Awards 2026. Coast tickets flash sale and coast event flash sale offers: group of 5 at 1500, group of 10 at 3000. Buy online at Changer Fusions.",
      inLanguage: "en-KE",
      isPartOf: {
        "@type": "WebSite",
        name: "Changer Fusions | CMF Agency",
        url: "https://cmfagency.co.ke",
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: IMAGE,
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
          name: "Upcoming Events",
          item: "https://cmfagency.co.ke/events/upcoming",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Coast Fashion Flash Sale Tickets",
          item: PAGE_URL,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": `${PAGE_URL}#event`,
      name: "Coast Fashion and Modelling Awards 2026 Flash Sale",
      alternateName: [
        "Coast Fashion Flash Sale Tickets",
        "Coast Tickets Flash Sale",
        "Coast Event Flash Sale",
        "CFMA 2026 Flash Sale",
      ],
      description:
        "Coast fashion flash sale tickets for the Coast Fashion and Modelling Awards 2026 in Mombasa, Kenya. Coast tickets flash sale and coast event flash sale — group of 5 at 1500, group of 10 at 3000.",
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
      image: IMAGE,
      organizer: {
        "@type": "Organization",
        name: "Changer Fusions",
        url: "https://cmfagency.co.ke",
      },
      offers: [
        {
          "@type": "Offer",
          name: "Coast fashion flash sale tickets — group of 5 at 1500",
          description: "Group of 5 at 1500 — coast tickets flash sale",
          price: "1500",
          priceCurrency: "KES",
          availability: "https://schema.org/InStock",
          url: PAGE_URL,
          validFrom: "2026-08-01",
          category: "Flash Sale",
        },
        {
          "@type": "Offer",
          name: "Coast fashion flash sale tickets — group of 10 at 3000",
          description: "Group of 10 at 3000 — coast event flash sale",
          price: "3000",
          priceCurrency: "KES",
          availability: "https://schema.org/InStock",
          url: PAGE_URL,
          validFrom: "2026-08-01",
          category: "Flash Sale",
        },
      ],
      url: PAGE_URL,
    },
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
