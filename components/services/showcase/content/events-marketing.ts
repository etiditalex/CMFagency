import type { ServiceShowcaseConfig } from "@/components/services/showcase/types";

export const eventsMarketingShowcase: ServiceShowcaseConfig = {
  route: "/services/events-marketing",
  watermark: "Events",
  title: "Events Marketing",
  heroDescription:
    "From concept to curtain call, we plan, promote, and deliver events that put your brand in the room — and keep it remembered after.",
  heroImage: {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_8_jjuk4p.jpg",
    alt: "Guests at The Kings Experience, an event marketed by Changer Fusions",
  },
  bands: [
    {
      id: "events-experience",
      title: "Moments that move brands",
      paragraphs: [
        "Great events do more than fill seats. They create presence, press, and connection — on the night and long after the lights go down.",
        "We manage the full journey: concept, promotion, production, and post-event storytelling so your investment shows up in brand impact.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards3_nw8dby.jpg",
        alt: "Coast Fashion and Modelling Awards stage production",
      },
      imageSide: "left",
      tone: "white",
    },
    {
      id: "events-scope",
      title: "What we take care of",
      paragraphs: [
        "End-to-end event marketing and management, tailored to your goals and audience.",
      ],
      bullets: [
        "Concept development, planning, and budgeting",
        "Venue sourcing, setup, and vendor coordination",
        "Pre-event marketing and audience promotion",
        "On-site execution and guest experience",
        "Media coverage, documentation, and post-event reporting",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
        alt: "Live event atmosphere captured during a Changer Fusions production",
      },
      imageSide: "right",
      tone: "tint",
    },
    {
      id: "events-delivery",
      title: "Executed with precision",
      paragraphs: [
        "We treat every detail as part of the brand experience — from the first invite to the final walk-through report.",
        "Whether it is a fashion awards night, a corporate showcase, or a community activation, we keep the plan tight and the energy high.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
        alt: "On-site event coordination at a Changer Fusions production",
      },
      imageSide: "left",
      tone: "white",
      link: {
        href: "/contact",
        label: "Plan your next event",
        prefix: "Ready to host?",
        suffix: "with a team that delivers.",
      },
    },
  ],
  collage: {
    id: "events-gallery",
    title: "Built for the spotlight",
    paragraphs: [
      "Our event work spans fashion, lifestyle, and brand experiences — always designed to feel premium and purposeful.",
      "Bring us the ambition; we bring the production, promotion, and polish that make the night land.",
    ],
    images: [
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
        alt: "Guests experiencing a Changer Fusions branded event",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards2_defemi.jpg",
        alt: "Coast Fashion Awards runway and audience moment",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_2_adeysa.jpg",
        alt: "Seated guests at a Global Women Impact event",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
        alt: "Event branding and staging detail",
      },
    ],
  },
};
