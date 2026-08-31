export type ServiceShowcaseImage = {
  src: string;
  alt: string;
  /** Prefer contain for illustrations so edges are not cropped. */
  fit?: "cover" | "contain";
};

export type ServiceShowcaseBand = {
  id: string;
  title: string;
  paragraphs: string[];
  image: ServiceShowcaseImage;
  /** Desktop image placement. Mobile always shows text first. */
  imageSide: "left" | "right";
  tone: "white" | "tint";
  bullets?: string[];
  link?: {
    href: string;
    label: string;
    prefix?: string;
    suffix?: string;
  };
  cta?: {
    href: string;
    label: string;
    /** When set, the browser downloads the file instead of navigating. */
    download?: string | true;
  };
};

export type ServiceShowcaseConfig = {
  route: string;
  watermark: string;
  title: string;
  heroDescription: string;
  heroImage: ServiceShowcaseImage;
  bands: ServiceShowcaseBand[];
  collage: {
    id: string;
    title: string;
    paragraphs: string[];
    images: ServiceShowcaseImage[];
  };
};
