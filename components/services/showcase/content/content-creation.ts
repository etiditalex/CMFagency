import type { ServiceShowcaseConfig } from "@/components/services/showcase/types";

export const contentCreationShowcase: ServiceShowcaseConfig = {
  route: "/services/content-creation",
  watermark: "Create",
  title: "Content Creation",
  heroDescription:
    "We produce video, social, and written content that sounds like your brand and earns attention where your audience already spends time.",
  heroImage: {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg",
    alt: "Content production set with Changer Fusions creative team",
  },
  bands: [
    {
      id: "content-story",
      title: "Stories people stop for",
      paragraphs: [
        "Content is how your brand shows up between campaigns — in feeds, inboxes, and search. We craft work that is clear, on-brand, and built to engage.",
        "From commercial films to social posts and long-form writing, we help you say the right thing in the right format.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
        alt: "On-location content shoot directed by Changer Fusions",
      },
      imageSide: "left",
      tone: "white",
    },
    {
      id: "content-services",
      title: "What we create",
      paragraphs: [
        "A full content studio for brands that need consistency without losing craft.",
      ],
      bullets: [
        "Commercial, explainer, and testimonial video",
        "Social media content and campaign assets",
        "Blog writing, articles, and email newsletters",
        "Infographics and product storytelling",
        "Production, editing, and finishing",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
        alt: "Styled content capture for a brand storytelling campaign",
      },
      imageSide: "right",
      tone: "tint",
    },
    {
      id: "content-process",
      title: "Creative with a brief that works",
      paragraphs: [
        "We align on message, audience, and channel first — then produce with the polish and pace your calendar needs.",
        "You get content that is ready to publish, easy to reuse, and consistent with the brand system we help you protect.",
      ],
      image: {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg",
        alt: "Creative direction during a Changer Fusions content production",
      },
      imageSide: "left",
      tone: "white",
      link: {
        href: "/contact",
        label: "Brief your next content project",
        prefix: "Ready to create?",
        suffix: "with our production team.",
      },
    },
  ],
  collage: {
    id: "content-gallery",
    title: "Crafted for every frame",
    paragraphs: [
      "Our content work lives in fashion, lifestyle, and brand storytelling — always intentional, always camera-ready.",
      "Share the story you need to tell; we bring the scripts, shoots, and edits that make it land.",
    ],
    images: [
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0319_e1wrwf.jpg",
        alt: "Portrait content still from a Changer Fusions production",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892257/IMG_0340_alj30p.jpg",
        alt: "Behind-the-scenes content creation moment",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0389_jdgcfx.jpg",
        alt: "Styled editorial content for brand storytelling",
      },
      {
        src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9855_tpqcuh.jpg",
        alt: "Finished visual content from a creative shoot",
      },
    ],
  },
};
