import type { ServiceShowcaseConfig } from "@/components/services/showcase/types";

export const marketResearchShowcase: ServiceShowcaseConfig = {
  route: "/services/market-research",
  watermark: "Insight",
  title: "Market Research",
  heroDescription:
    "We turn audience behaviour, competitor moves, and market signals into clear direction for your next marketing decision.",
  heroImage: {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786437581/market_re_l6khs9.jpg",
    alt: "Market research presentation with data insights on a dashboard screen",
  },
  bands: [
    {
      id: "research-why",
      title: "Decisions backed by evidence",
      paragraphs: [
        "Guesswork is expensive. We dig into who your customers are, what they respond to, and where the real opportunity sits — so strategy is grounded, not assumed.",
        "Whether you are entering a market, refining a campaign, or testing a new offer, we give you insight you can act on.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360469/careers_mtyoxg.jpg",
        alt: "Strategy and research discussion with Changer Fusions advisors",
      },
      imageSide: "left",
      tone: "white",
    },
    {
      id: "research-services",
      title: "What we uncover",
      paragraphs: [
        "Our research programmes are built around the questions that move your business forward.",
      ],
      bullets: [
        "Consumer behaviour and audience profiling",
        "Competitor and category analysis",
        "Trend tracking and opportunity mapping",
        "Segmentation and positioning insight",
        "Data analytics, reporting, and strategy recommendations",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786437943/What_we_uncover_wbinsz.jpg",
        alt: "Hands holding crumpled paper during a research and discovery process",
      },
      imageSide: "right",
      tone: "tint",
    },
    {
      id: "research-process",
      title: "From data to direction",
      paragraphs: [
        "We combine desk research, field insight, and performance signals into reports your team can use — not slide decks that sit unread.",
        "You get clear findings, prioritised recommendations, and a path to smarter spend and stronger campaigns.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786438536/global-communication_1_h8rqte.jpg",
        alt: "Professional reviewing global market insights connected through digital networks",
      },
      imageSide: "left",
      tone: "white",
      link: {
        href: "/contact",
        label: "Talk to our research team",
        prefix: "Ready for clarity?",
        suffix: "about your market.",
      },
    },
  ],
  collage: {
    id: "research-outcomes",
    title: "Insight that shapes better campaigns",
    paragraphs: [
      "When you understand the room, the category, and the customer, every creative and media choice gets sharper.",
      "We help brands reduce risk, focus budgets, and move with confidence — backed by research that connects to real outcomes.",
    ],
    images: [
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_2_fixdek.jpg",
        alt: "Event attendees providing market context for research",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_4_rcq1m6.jpg",
        alt: "Live audience engagement captured for insight work",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360874/career_assistance_zcuimx.jpg",
        alt: "One-to-one advisory session informing market strategy",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg",
        alt: "Changer Fusions professionals collaborating on research outcomes",
      },
    ],
  },
};
