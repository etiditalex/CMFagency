import Link from "next/link";
import { Download } from "lucide-react";
import { downloadShowcase } from "@/components/services/showcase/content/download";
import DownloadDeferredContact from "@/components/download/DownloadDeferredContact";
import DownloadImage from "@/components/download/DownloadImage";
import type { ServiceShowcaseBand, ServiceShowcaseImage } from "@/components/services/showcase/types";

const headingId = "download-hero-heading";
const HERO_SIZES = "(max-width: 1024px) 100vw, 720px";
const BAND_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 560px";
const belowFoldClass =
  "[content-visibility:auto] [contain-intrinsic-size:auto_28rem]";

function BandImage({ image }: { image: ServiceShowcaseImage }) {
  const imageFit = image.fit === "contain" ? "object-contain" : "object-cover";
  const imageBg = image.fit === "contain" ? "bg-white" : "bg-primary-100";

  return (
    <div
      className={`relative aspect-[16/11] w-full overflow-hidden rounded-xl sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl ${imageBg}`}
    >
      <DownloadImage
        src={image.src}
        alt={image.alt}
        fill
        quality={65}
        loading="lazy"
        decoding="async"
        className={`${imageFit} object-center`}
        sizes={BAND_SIZES}
      />
    </div>
  );
}

function BandSection({ band, deferPaint }: { band: ServiceShowcaseBand; deferPaint: boolean }) {
  const imageLeft = band.imageSide === "left";
  const toneClass = band.tone === "tint" ? "bg-primary-50" : "bg-white";
  const imageOrder = imageLeft
    ? "order-2 w-full lg:order-1 lg:col-span-5"
    : "order-2 w-full lg:order-2 lg:col-span-5";
  const textOrder = imageLeft
    ? "order-1 w-full lg:order-2 lg:col-span-7"
    : "order-1 w-full lg:order-1 lg:col-span-7";

  return (
    <section
      className={`service-showcase-about w-full py-10 sm:py-14 md:py-16 lg:py-20 ${toneClass} ${
        deferPaint ? belowFoldClass : ""
      }`}
      aria-labelledby={band.id}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className={imageOrder}>
            <BandImage image={band.image} />
          </div>

          <div className={textOrder}>
            <h2
              id={band.id}
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              {band.title}
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              {band.paragraphs.map((paragraph, index) => (
                <p key={`${band.id}-p-${index}`} className="!text-left">
                  {paragraph}
                </p>
              ))}
            </div>

            {band.bullets && band.bullets.length > 0 ? (
              <ul className="mt-5 space-y-2.5 text-sm text-gray-800 sm:mt-6 sm:text-base">
                {band.bullets.map((item) => (
                  <li key={item} className="!text-left flex gap-2.5">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {band.link ? (
              <p className="!text-left mt-5 text-sm text-gray-800 sm:mt-6 sm:text-base">
                {band.link.prefix ? `${band.link.prefix} ` : null}
                <Link
                  href={band.link.href}
                  prefetch={false}
                  className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
                >
                  {band.link.label}
                </Link>
                {band.link.suffix ? ` ${band.link.suffix}` : null}
              </p>
            ) : null}

            {band.cta ? (
              <a
                href={band.cta.href}
                {...(band.cta.download
                  ? {
                      download:
                        band.cta.download === true ? true : band.cta.download,
                    }
                  : {})}
                className="btn-primary mt-6 inline-flex items-center gap-2"
              >
                {band.cta.download ? <Download className="h-5 w-5" aria-hidden /> : null}
                {band.cta.label}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DownloadPageView() {
  const { watermark, title, heroDescription, heroImage, bands, collage } = downloadShowcase;
  const collageImage = collage.images[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <section
        className="service-showcase-hero w-full bg-white pt-28 sm:pt-32 md:pt-36"
        aria-labelledby={headingId}
      >
        <div className="relative overflow-hidden rounded-tl-[3.5rem] bg-primary-600 sm:rounded-tl-[5.5rem] md:rounded-tl-[7rem] lg:rounded-tl-[9rem]">
          <div className="grid min-h-[360px] grid-cols-1 lg:min-h-[520px] lg:grid-cols-2 xl:min-h-[560px]">
            <div className="relative z-10 flex items-center bg-primary-600 px-6 py-10 sm:px-10 sm:py-14 md:px-14 md:py-16 lg:px-16 lg:py-20 xl:px-20">
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-1/2 -translate-y-[55%] select-none font-montserrat text-[3.5rem] font-bold uppercase leading-none tracking-tight text-white/[0.07] sm:text-[5.5rem] md:text-[7rem] lg:text-[8rem] xl:text-[9.5rem]"
              >
                {watermark}
              </span>

              <div className="relative w-full max-w-xl">
                <div
                  className="mb-5 h-1.5 w-14 rounded-sm bg-secondary-400 sm:mb-6 sm:h-2 sm:w-16"
                  aria-hidden
                />
                <h1
                  id={headingId}
                  className="!text-left font-montserrat text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.75rem] lg:text-5xl"
                >
                  {title}
                </h1>
                <p className="!text-left mt-4 max-w-md text-sm leading-relaxed text-white/95 sm:mt-5 sm:text-base md:text-lg md:leading-[1.7]">
                  {heroDescription}
                </p>
              </div>
            </div>

            <div className="relative min-h-[180px] sm:min-h-[260px] lg:min-h-full">
              <DownloadImage
                src={heroImage.src}
                alt={heroImage.alt}
                fill
                priority
                fetchPriority="high"
                quality={70}
                decoding="async"
                className="object-cover object-center"
                sizes={HERO_SIZES}
              />
              <div className="absolute inset-0 bg-primary-700/25 mix-blend-multiply" aria-hidden />
              <div
                className="absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-r from-primary-600 via-primary-600/70 to-transparent lg:block xl:w-36"
                aria-hidden
              />
              <div
                className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-primary-600/80 to-transparent sm:h-16 lg:hidden"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      {bands.map((band, index) => (
        <BandSection key={band.id} band={band} deferPaint={index > 0} />
      ))}

      <section
        className={`service-showcase-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20 ${belowFoldClass}`}
        aria-labelledby={collage.id}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            <div className="order-1 w-full lg:order-1 lg:col-span-6">
              <h2
                id={collage.id}
                className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
              >
                {collage.title}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
                {collage.paragraphs.map((paragraph, index) => (
                  <p key={`${collage.id}-p-${index}`} className="!text-left">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {collageImage ? (
              <div className="order-2 w-full lg:order-2 lg:col-span-6">
                <BandImage image={collageImage} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <DownloadDeferredContact />
    </div>
  );
}
