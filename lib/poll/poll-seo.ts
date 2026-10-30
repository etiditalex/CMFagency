import type { Metadata } from "next";
import { POLL_FAQ, POLL_STEPS } from "@/lib/poll/poll-copy";
import { SITE_URL } from "@/lib/site-url";

const OG_IMAGE = "/images/poll-hero-ballot.jpg";

export function pollMetadata(input: { title: string; description: string; path: string; index?: boolean }): Metadata {
  const url = `${SITE_URL}${input.path}`;
  const index = input.index !== false;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } }
      : { index: false, follow: false },
    openGraph: {
      title: `${input.title} | Changer Fusions`,
      description: input.description,
      url,
      siteName: "Changer Fusions",
      locale: "en_KE",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Changer Fusions polls" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} | Changer Fusions`,
      description: input.description,
      images: [OG_IMAGE],
    },
  };
}

function breadcrumb(items: Array<{ name: string; path: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function pollLandingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "" },
        { name: "Poll", path: "/poll" },
      ]),
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/poll#webpage`,
        url: `${SITE_URL}/poll`,
        name: "Create a free audience poll",
        description: POLL_FAQ[0].answer,
        isPartOf: { "@type": "WebSite", name: "Changer Fusions", url: SITE_URL },
        about: { "@type": "Thing", name: "Audience polls" },
        speakable: { "@type": "SpeakableSpecification", cssSelector: ["#poll-hero-heading", "#poll-answer"] },
      },
      {
        "@type": "FAQPage",
        mainEntity: POLL_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function createPollJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "" },
        { name: "Poll", path: "/poll" },
        { name: "Create a poll", path: "/poll/create" },
      ]),
      {
        "@type": "HowTo",
        name: "How to create a poll in three simple steps",
        description: "Ask a question, share the link, and follow the live tally on Changer Fusions.",
        totalTime: "PT2M",
        step: POLL_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
          url: `${SITE_URL}/poll/create#create-poll`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: POLL_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function livePollsJsonLd(polls: Array<{ id: string; title: string; question?: string }>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "" },
        { name: "Live opinion polls", path: "/poll/live" },
      ]),
      {
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/poll/live#webpage`,
        url: `${SITE_URL}/poll/live`,
        name: "Live opinion polls and results",
        description:
          "Live opinion polls from Changer Fusions for brands, politics, events, and campaigns, recorded in Polling Fx.",
        speakable: { "@type": "SpeakableSpecification", cssSelector: ["#live-polls-heading", "#live-polls-answer"] },
      },
      {
        "@type": "ItemList",
        name: "Live opinion polls",
        itemListElement: polls.slice(0, 24).map((poll, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/poll/live/${poll.id}`,
          name: poll.title,
          description: poll.question || poll.title,
        })),
      },
    ],
  };
}

export function pollResultJsonLd(input: {
  id: string;
  title: string;
  question: string;
  options: Array<{ name: string; votes: number }>;
}) {
  const url = `${SITE_URL}/poll/live/${input.id}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb([
        { name: "Home", path: "" },
        { name: "Live opinion polls", path: "/poll/live" },
        { name: input.title, path: `/poll/live/${input.id}` },
      ]),
      {
        "@type": "QAPage",
        "@id": `${url}#qa`,
        url,
        name: input.title,
        mainEntity: {
          "@type": "Question",
          name: input.question,
          answerCount: input.options.length,
          suggestedAnswer: input.options.map((option) => ({
            "@type": "Answer",
            text: `${option.name}: ${option.votes} votes`,
          })),
        },
      },
    ],
  };
}
