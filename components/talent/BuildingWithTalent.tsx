"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const COLLAGE_IMAGES = [
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards3_nw8dby.jpg",
    alt: "Coast Fashion and Modelling Awards runway talent",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition202510_a1pxnz.jpg",
    alt: "High fashion audition and casting with Changer Fusions",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_8_jjuk4p.jpg",
    alt: "Event hosting and creative talent on stage",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition20257_aptp81.jpg",
    alt: "Modelling and creative direction at Changer Fusions Kenya",
  },
] as const;

export default function BuildingWithTalent() {
  return (
    <section
      className="talent-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="building-with-talent"
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
              id="building-with-talent"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              Building with Changer Fusions talent
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                Brands and organisers work with us when they need talent who arrive prepared,
                briefed, and aligned to the creative. We coordinate casting, contracts, and
                on-site delivery so campaigns and events stay on schedule.
              </p>
              <p className="!text-left">
                We expect punctuality, clear communication, and respect for crew and other talent
                on set. Minors and teen categories are handled with additional safeguards
                appropriate to family-facing events.
              </p>
              <p className="!text-left">
                Whether you are booking for a shoot or building your own creative career, Changer
                Fusions connects opportunity with professionalism—rooted in Mombasa and serving
                clients across Kenya.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 w-full lg:order-2 lg:col-span-6"
          >
            <div className="mx-auto grid aspect-square w-full max-w-md grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-xl bg-white sm:max-w-none sm:gap-1.5 sm:rounded-2xl md:aspect-[5/4] lg:rounded-3xl">
              {COLLAGE_IMAGES.map((image) => (
                <div key={image.src} className="relative min-h-0 overflow-hidden">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 40vw, 25vw"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
