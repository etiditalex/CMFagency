const PAGE_URL = "https://cmfagency.co.ke/careers";
const OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360469/careers_mtyoxg.jpg";

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${PAGE_URL}#webpage`,
    url: PAGE_URL,
    name: "Careers at Changer Fusions | Attachments, Internships & Jobs in Kenya",
    description:
      "Explore career development with Changer Fusions in Kenya. Find attachments, internships, and jobs in marketing, fashion, events, and education.",
    inLanguage: "en-KE",
    isPartOf: {
      "@type": "WebSite",
      name: "Changer Fusions",
      url: "https://cmfagency.co.ke",
    },
    about: [
      { "@type": "Thing", name: "Career development" },
      { "@type": "Thing", name: "Internships" },
      { "@type": "Thing", name: "Student attachments" },
      { "@type": "Thing", name: "Jobs in Kenya" },
    ],
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: OG_IMAGE,
    },
    publisher: {
      "@type": "Organization",
      name: "Changer Fusions",
      url: "https://cmfagency.co.ke",
      telephone: "+254797777347",
      email: "info@cmfagency.co.ke",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Ambalal Building, Nkruma Road",
        addressLocality: "Mombasa",
        addressCountry: "KE",
      },
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
        name: "Careers",
        item: PAGE_URL,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Career pathways at Changer Fusions",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Attachments",
        url: "https://cmfagency.co.ke/careers/attachments",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Internships",
        url: "https://cmfagency.co.ke/careers/internships",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Jobs",
        url: "https://cmfagency.co.ke/careers/jobs",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Career development",
        url: "https://cmfagency.co.ke/career",
      },
    ],
  },
];

/** Server-rendered JSON-LD for search engines (not shown in the page UI). */
export default function CareersJsonLd() {
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
