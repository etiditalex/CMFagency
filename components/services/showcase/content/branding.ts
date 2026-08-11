import type { ServiceShowcaseConfig } from "@/components/services/showcase/types";

export const brandingShowcase: ServiceShowcaseConfig = {
  route: "/services/branding",
  watermark: "Brand",
  title: "Branding & Creative",
  heroDescription:
    "We shape identities that feel intentional, memorable, and ready to grow with your business across every channel.",
  heroImage: {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786436151/branding-innovation-creative-inspire-concept_1_kplp0a.jpg",
    alt: "Branding workspace with creative identity design on screen",
  },
  bands: [
    {
      id: "branding-identity",
      title: "Identity that carries your story",
      paragraphs: [
        "A strong brand is more than a logo. We define positioning, voice, and visual systems so every touchpoint feels consistent and credible.",
        "From first impressions to long-term recognition, we help you show up with clarity — whether you are launching, refining, or fully rebranding.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786436340/front-view-woman-with-book_1_eukizn.jpg",
        alt: "Creative portrait conveying brand storytelling and identity",
      },
      imageSide: "left",
      tone: "white",
    },
    {
      id: "branding-services",
      title: "What we deliver",
      paragraphs: [
        "Our branding and creative work covers strategy, design, and the assets you need to market with confidence.",
      ],
      bullets: [
        "Brand strategy and positioning",
        "Logo design and visual identity systems",
        "Brand guidelines and messaging frameworks",
        "Marketing collateral and campaign creative",
        "Rebranding and brand refresh programmes",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786436525/What_we_deliver_putve9.jpg",
        alt: "Illustration of delivering creative brand solutions to clients",
        fit: "contain",
      },
      imageSide: "right",
      tone: "tint",
    },
    {
      id: "branding-process",
      title: "How we build with you",
      paragraphs: [
        "We start with discovery — audience, competitors, and ambition — then translate insight into a visual and verbal system your team can use every day.",
        "You leave with assets, guidelines, and a clear playbook so your brand stays sharp as you scale.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786436668/howwebuildwithyou_aa1frn.jpg",
        alt: "Team collaborating on brand strategy and creative planning",
      },
      imageSide: "left",
      tone: "white",
      link: {
        href: "/contact",
        label: "Start a branding conversation",
        prefix: "Ready to build?",
        suffix: "with our creative team.",
      },
    },
  ],
  collage: {
    id: "branding-outcomes",
    title: "Creative that works in the real world",
    paragraphs: [
      "We design for recognition: on stage, on screen, in print, and in the moments your audience first meets you.",
      "Whether you need a full identity system or campaign-ready creative, we craft work that feels like you — and performs like a brand people remember.",
    ],
    images: [
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786436917/character-watering-idea_1_bfjja9.jpg",
        alt: "Illustration of nurturing a creative idea into a working brand concept",
        fit: "contain",
      },
    ],
  },
};
