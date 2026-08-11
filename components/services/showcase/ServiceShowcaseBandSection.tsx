"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cloudinaryLoader } from "@/lib/cloudinary";
import type { ServiceShowcaseBand } from "./types";

type ServiceShowcaseBandSectionProps = {
  band: ServiceShowcaseBand;
};

export default function ServiceShowcaseBandSection({ band }: ServiceShowcaseBandSectionProps) {
  const imageLeft = band.imageSide === "left";
  const toneClass = band.tone === "tint" ? "bg-primary-50" : "bg-white";
  const imageFit = band.image.fit === "contain" ? "object-contain" : "object-cover";
  const imageBg = band.image.fit === "contain" ? "bg-white" : "bg-primary-100";

  const imageOrder = imageLeft
    ? "order-2 w-full lg:order-1 lg:col-span-5"
    : "order-2 w-full lg:order-2 lg:col-span-5";
  const textOrder = imageLeft
    ? "order-1 w-full lg:order-2 lg:col-span-7"
    : "order-1 w-full lg:order-1 lg:col-span-7";

  return (
    <section
      className={`service-showcase-about w-full py-10 sm:py-14 md:py-16 lg:py-20 ${toneClass}`}
      aria-labelledby={band.id}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: imageLeft ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className={imageOrder}
          >
            <div
              className={`relative aspect-[16/11] w-full overflow-hidden rounded-xl sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl ${imageBg}`}
            >
              <Image
                src={band.image.src}
                alt={band.image.alt}
                fill
                loader={cloudinaryLoader}
                quality={75}
                className={`${imageFit} object-center`}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 42vw"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: imageLeft ? 20 : -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={textOrder}
          >
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
                  className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
                >
                  {band.link.label}
                </Link>
                {band.link.suffix ? ` ${band.link.suffix}` : null}
              </p>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
