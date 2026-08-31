import type { ServiceShowcaseConfig } from "@/components/services/showcase/types";

export const COMPANY_PROFILE_HREF = "/downloads/Changer-company-profile.pdf";
export const COMPANY_PROFILE_FILENAME = "Changer company profile.pdf";

export const downloadShowcase: ServiceShowcaseConfig = {
  route: "/download",
  watermark: "Profile",
  title: "Download",
  heroDescription:
    "Get the official Changer Fusions company profile — who we are, how we work, and how we partner with brands across Kenya.",
  heroImage: {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1788181706/downlaod_w6m0oq.jpg",
    alt: "Download the Changer Fusions company profile",
  },
  bands: [
    {
      id: "download-profile",
      title: "The company profile, in one file",
      paragraphs: [
        "Our company profile is the shortest way to understand Changer Fusions: a Mombasa-based marketing agency working with companies, institutions, and event owners across Kenya.",
        "Share it with a board, a procurement team, or a new partner who needs a clear picture of who we are before the first conversation.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1788182187/sectional_ah4zl4.jpg",
        alt: "Changer Fusions company profile sectional",
      },
      imageSide: "left",
      tone: "white",
    },
    {
      id: "download-contents",
      title: "What you will find inside",
      paragraphs: [
        "The PDF covers the essentials we are asked for most often — so you can brief stakeholders without waiting on a call.",
      ],
      bullets: [
        "Who we are and where we operate from in Mombasa",
        "Services across marketing, branding, events, and digital",
        "How we plan, execute, and measure work with clients",
        "Contact details for proposals, partnerships, and press",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1788181844/company_profile_qnhwtu.jpg",
        alt: "Changer Fusions company profile",
      },
      imageSide: "right",
      tone: "tint",
      cta: {
        href: COMPANY_PROFILE_HREF,
        label: "Download company profile",
        download: COMPANY_PROFILE_FILENAME,
      },
    },
    {
      id: "download-use",
      title: "Use it when you need us on paper",
      paragraphs: [
        "Keep the profile on hand for RFPs, partnership decks, and internal sign-off. It is the same story we tell in person — written so a new reader can follow it in one sitting.",
        "If you need a scoped proposal after reading it, our team is ready to talk through your brief.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786436668/howwebuildwithyou_aa1frn.jpg",
        alt: "Team collaborating on a client briefing and company profile",
      },
      imageSide: "left",
      tone: "white",
      link: {
        href: "/contact",
        label: "Start a conversation",
        prefix: "Ready to work together?",
        suffix: "with our team.",
      },
    },
  ],
  collage: {
    id: "download-next",
    title: "A brand built to be shared",
    paragraphs: [
      "The company profile is a snapshot. The work behind it is campaigns, stages, websites, and identities that have to hold up in the real world.",
      "Download the file, then tell us what you need next — a proposal, a campaign, or a partner who can carry the brief from strategy to delivery.",
    ],
    images: [
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1788182883/sharing_pylyhk.jpg",
        alt: "Sharing the Changer Fusions company profile",
      },
    ],
  },
};
