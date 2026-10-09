import { CREATE_POLL_FAQ, CREATE_POLL_STEPS } from "@/lib/poll/create-poll-content";
import { SITE_URL } from "@/lib/site-url";

function crumbs(path: string, name: string) {
  const items = [
    { name: "Home", path: "" },
    { name: "Poll", path: "/poll" },
  ];
  if (path !== "/poll") items.push({ name, path });
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE_URL}${path}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

function webpage(path: string, name: string, description: string) {
  return {
    "@type": "WebPage",
    "@id": `${SITE_URL}${path}#webpage`,
    url: `${SITE_URL}${path}`,
    name,
    description,
    inLanguage: "en-KE",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Changer Fusions", url: SITE_URL },
    breadcrumb: { "@id": `${SITE_URL}${path}#breadcrumb` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

const organization = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Changer Fusions",
  url: SITE_URL,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ambalal Building, Nkruma Road",
    addressLocality: "Mombasa",
    addressCountry: "KE",
  },
};

export function pollLandingJsonLd() {
  const path = "/poll";
  const description =
    "Changer Fusions polls let an audience vote on a runway choice, a session, or a public decision, then see the tally update live.";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      webpage(path, "Create a poll in seconds", description),
      crumbs(path, "Poll"),
      {
        "@type": "Service",
        name: "Changer Fusions polls",
        serviceType: "Audience poll",
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "Kenya" },
        url: `${SITE_URL}/poll`,
        description,
        offers: { "@type": "Offer", price: "0", priceCurrency: "KES", description: "Creating a poll and voting are free." },
      },
    ],
  };
}

export function createPollJsonLd() {
  const path = "/poll/create";
  const description = "Create a free Changer Fusions poll, share the link, and watch the votes update on the public results page.";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      webpage(path, "Create a poll", description),
      crumbs(path, "Create a poll"),
      {
        "@type": "HowTo",
        name: "How to create a poll in three simple steps",
        description,
        totalTime: "PT2M",
        step: CREATE_POLL_STEPS.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.body,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: CREATE_POLL_FAQ.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function livePollsJsonLd(polls: Array<{ id: string; title: string; topicLabel: string }>) {
  const path = "/poll/live";
  const description =
    "Live opinion polls from Changer Fusions Polling Fx. Follow politics, brands, events, and opinion polls as the votes come in.";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      { ...webpage(path, "Live opinion polls", description), "@type": "CollectionPage" },
      crumbs(path, "Live polls"),
      {
        "@type": "ItemList",
        name: "Live opinion polls",
        numberOfItems: polls.length,
        itemListElement: polls.slice(0, 24).map((poll, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: poll.title,
          description: poll.topicLabel,
          url: `${SITE_URL}/poll/live/${poll.id}`,
        })),
      },
    ],
  };
}

export function pollResultJsonLd(input: {
  id: string;
  title: string;
  question: string;
  topicLabel: string;
  options: Array<{ name: string; votes: number }>;
  feature?: "poll" | "live";
}) {
  const isPoll = input.feature === "poll";
  const path = isPoll ? `/poll/${input.id}` : `/poll/live/${input.id}`;
  const total = input.options.reduce((sum, option) => sum + option.votes, 0);
  const leader = [...input.options].sort((a, b) => b.votes - a.votes)[0];
  const answer = leader
    ? `${leader.name} leads with ${leader.votes.toLocaleString("en-KE")} votes. Total votes recorded: ${total.toLocaleString("en-KE")}.`
    : "No votes have been recorded yet.";
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      webpage(path, input.title, input.question),
      {
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}${path}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          isPoll
            ? { "@type": "ListItem", position: 2, name: "Poll", item: `${SITE_URL}/poll` }
            : { "@type": "ListItem", position: 2, name: "Live polls", item: `${SITE_URL}/poll/live` },
          { "@type": "ListItem", position: 3, name: input.title, item: `${SITE_URL}${path}` },
        ],
      },
      {
        "@type": "Question",
        name: input.question,
        text: `${input.topicLabel} poll: ${input.title}`,
        acceptedAnswer: { "@type": "Answer", text: answer },
        suggestedAnswer: input.options.map((option) => ({
          "@type": "Answer",
          text: `${option.name}: ${option.votes.toLocaleString("en-KE")} votes`,
        })),
      },
    ],
  };
}
