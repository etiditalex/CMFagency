import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import {
  TEAM_PAGE_URL,
  leadershipMembers,
  memberFullBio,
} from "./team-data";

const ORG_ID = "https://cmfagency.co.ke/#organization";

function personSchema(member: (typeof leadershipMembers)[number]) {
  const personId = `${TEAM_PAGE_URL}#${member.slug}`;
  return {
    "@type": "Person" as const,
    "@id": personId,
    name: member.name,
    jobTitle: member.position,
    description: memberFullBio(member),
    image: {
      "@type": "ImageObject" as const,
      url: member.image,
      contentUrl: member.image,
      caption: `${member.name}, ${member.position} at Changer Fusions`,
    },
    url: personId,
    worksFor: {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Changer Fusions",
      url: "https://cmfagency.co.ke",
    },
    knowsAbout: member.knowsAbout,
    workLocation: {
      "@type": "Place" as const,
      name: "Mombasa, Kenya",
      address: {
        "@type": "PostalAddress" as const,
        streetAddress: "Ambalal Building, Nkruma Road",
        addressLocality: "Mombasa",
        addressRegion: "Mombasa County",
        addressCountry: "KE",
      },
    },
  };
}

export default function TeamJsonLd() {
  const people = leadershipMembers.map((member) => personSchema(member));

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${TEAM_PAGE_URL}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://cmfagency.co.ke/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "About Us",
            item: "https://cmfagency.co.ke/about",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Our Team",
            item: TEAM_PAGE_URL,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${TEAM_PAGE_URL}#webpage`,
        url: TEAM_PAGE_URL,
        name: "Our Team & Board of Directors | Changer Fusions Kenya",
        description:
          "Meet the Changer Fusions Board of Directors in Mombasa, Kenya: Javan Rolynce (Founder & CEO), Alex Etidit (Technical Director), Victoria Mapenzi (Finance and Operations Director), and Christine Achilah (Events Coordinator).",
        inLanguage: "en-KE",
        isPartOf: {
          "@type": "WebSite",
          name: "Changer Fusions",
          url: "https://cmfagency.co.ke",
        },
        breadcrumb: { "@id": `${TEAM_PAGE_URL}#breadcrumb` },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: leadershipMembers[0]?.image,
        },
        about: people.map((person) => ({ "@id": person["@id"] })),
        mainEntity: { "@id": `${TEAM_PAGE_URL}#team-list` },
      },
      {
        "@type": "ItemList",
        "@id": `${TEAM_PAGE_URL}#team-list`,
        name: "Changer Fusions Board of Directors",
        description:
          "Leadership and board members of Changer Fusions, a marketing and events agency in Mombasa, Kenya.",
        numberOfItems: leadershipMembers.length,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: leadershipMembers.map((member, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${TEAM_PAGE_URL}#${member.slug}`,
          name: member.name,
          item: { "@id": `${TEAM_PAGE_URL}#${member.slug}` },
        })),
      },
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: "Changer Fusions",
        url: "https://cmfagency.co.ke",
        logo: BRAND_LOGO_URL,
        description:
          "Kenya marketing agency specializing in digital marketing, website development, branding, event management, and market research.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Ambalal Building, Nkruma Road",
          addressLocality: "Mombasa",
          addressRegion: "Mombasa County",
          postalCode: "40305",
          addressCountry: "KE",
        },
        employee: people.map((person) => ({ "@id": person["@id"] })),
      },
      ...people,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
