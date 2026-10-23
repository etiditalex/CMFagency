import Image from "next/image";
import type { ReactNode } from "react";

const BANNER_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

const MARKER_TONES = [
  { marker: "bg-gray-900", title: "text-gray-900" },
  { marker: "bg-primary-600", title: "text-primary-600" },
  { marker: "bg-accent-green", title: "text-accent-green" },
] as const;

export type LegalBlock = {
  title: string;
  paragraphs?: ReactNode[];
  items?: ReactNode[];
};

type Props = {
  title: string;
  introTitle: string;
  intro: ReactNode;
  storyKicker: string;
  storyTitle: string;
  blocks: LegalBlock[];
  contactIntro: string;
};

function updatedLabel() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

export default function LegalAboutPage({
  title,
  introTitle,
  intro,
  storyKicker,
  storyTitle,
  blocks,
  contactIntro,
}: Props) {
  const storyLines = storyTitle.split("\n");

  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-[calc(var(--site-mobile-dock-height)+1.5rem)] pt-[var(--site-nav-height)] md:pb-0">
      <section className="about-banner relative h-[4.5rem] overflow-hidden sm:h-20 md:h-24" aria-label={title}>
        <Image
          src={BANNER_IMAGE}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
        <div className="relative flex h-full items-center px-4 sm:px-10 lg:px-16 xl:px-24">
          <h1 className="font-montserrat text-[1.35rem] font-extrabold leading-none tracking-wide text-white sm:text-4xl md:text-5xl">
            {title}
          </h1>
        </div>
      </section>

      <section className="about-pillars px-4 py-10 sm:px-6 sm:py-16 md:py-20 lg:px-8">
        <div className="text-center">
          <h2 className="font-montserrat text-2xl font-extrabold text-gray-900 md:text-3xl">{introTitle}</h2>
          <span className="mx-auto mt-2.5 block h-[3px] w-12 bg-primary-600" />
        </div>
        <div className="mx-auto mt-6 max-w-3xl space-y-4 text-center text-sm leading-relaxed text-gray-600 md:mt-8 md:text-[0.95rem]">
          {intro}
        </div>
      </section>

      <section className="about-years bg-[#f4f4f4] px-4 py-10 sm:px-8 sm:py-16 md:py-24 lg:px-16">
        <div className="mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-[minmax(14rem,22rem)_1fr] md:gap-8 lg:gap-20">
          <div className="pt-1">
            <p className="text-sm font-medium text-primary-600 sm:text-[0.95rem]">{storyKicker}</p>
            <h2 className="mt-3 font-montserrat text-[2.65rem] font-black uppercase leading-[0.86] tracking-tight text-gray-800 sm:mt-5 sm:text-6xl lg:text-7xl xl:text-[4.85rem]">
              {storyLines.map((line, index) => (
                <span key={line}>
                  {index > 0 ? <br /> : null}
                  {line}
                </span>
              ))}
            </h2>
          </div>

          <ol className="about-years-track relative min-w-0">
            {blocks.map((block, index) => {
              const tone = MARKER_TONES[index % MARKER_TONES.length];
              return (
                <li key={block.title} className="relative pb-7 pl-8 last:pb-2 sm:pb-8 sm:pl-9">
                  <span className={`about-years-marker ${tone.marker}`} aria-hidden="true" />
                  <h3 className={`font-montserrat text-sm font-bold sm:text-[0.95rem] ${tone.title}`}>{block.title}</h3>
                  {block.paragraphs?.map((paragraph, paragraphIndex) => (
                    <div
                      key={paragraphIndex}
                      className="mt-1 text-[0.8rem] leading-relaxed text-gray-700 [overflow-wrap:anywhere] md:text-[0.85rem]"
                    >
                      {paragraph}
                    </div>
                  ))}
                  {block.items && block.items.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[0.8rem] leading-relaxed text-gray-700 [overflow-wrap:anywhere] md:text-[0.85rem]">
                      {block.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="about-partners relative overflow-hidden px-4 py-10 sm:px-8 sm:py-16 md:py-20 lg:px-12">
        <div className="relative z-[1] mx-auto max-w-3xl text-center">
          <h2 className="font-montserrat text-xl font-extrabold text-white sm:text-2xl md:text-3xl">Contact Us</h2>
          <span className="mx-auto mt-2.5 block h-[3px] w-12 bg-primary-500" />
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/90 md:text-[0.95rem]">{contactIntro}</p>
          <p className="mt-4 text-sm leading-relaxed text-white md:text-[0.95rem]">
            <strong>Email:</strong>{" "}
            <a href="mailto:info@cmfagency.co.ke" className="underline">
              info@cmfagency.co.ke
            </a>
            <br />
            <strong>Phone:</strong>{" "}
            <a href="tel:+254797777347" className="underline">
              +254 797 777347
            </a>
            <br />
            <strong>Address:</strong> AMBALAL BUILDING, NKRUMA ROAD, MOMBASA, KENYA
          </p>
          <p className="mt-6 text-xs text-white/70">Last updated: {updatedLabel()}</p>
        </div>
      </section>
    </div>
  );
}
