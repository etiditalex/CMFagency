"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary";
import type { ServiceShowcaseImage } from "./types";

type ServiceShowcaseCollageSectionProps = {
  id: string;
  title: string;
  paragraphs: string[];
  images: ServiceShowcaseImage[];
};

export default function ServiceShowcaseCollageSection({
  id,
  title,
  paragraphs,
  images,
}: ServiceShowcaseCollageSectionProps) {
  const single = images.length === 1 ? images[0] : null;
  const singleFit = single?.fit === "contain" ? "object-contain" : "object-cover";
  const singleBg = single?.fit === "contain" ? "bg-white" : "bg-primary-100";

  return (
    <section
      className="service-showcase-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby={id}
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 w-full lg:order-1 lg:col-span-6"
          >
            <h2
              id={id}
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              {title}
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              {paragraphs.map((paragraph, index) => (
                <p key={`${id}-p-${index}`} className="!text-left">
                  {paragraph}
                </p>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 w-full lg:order-2 lg:col-span-6"
          >
            {single ? (
              <div
                className={`relative aspect-[16/11] w-full overflow-hidden rounded-xl sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl ${singleBg}`}
              >
                <Image
                  src={single.src}
                  alt={single.alt}
                  fill
                  loader={cloudinaryLoader}
                  quality={75}
                  className={`${singleFit} object-center`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 42vw"
                />
              </div>
            ) : (
              <div className="mx-auto grid aspect-square w-full max-w-md grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl bg-white sm:max-w-none sm:gap-1.5 sm:rounded-2xl md:aspect-[5/4] lg:rounded-3xl">
                {images.map((image) => (
                  <div key={image.src} className="relative min-h-0 overflow-hidden">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      loader={cloudinaryLoader}
                      quality={70}
                      className="object-cover object-center"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
