"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const SECTION_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786434598/fashion_showcase_pkr4du.jpg";

export default function TalentPathways() {
  return (
    <section
      className="talent-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="talent-pathways"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 w-full lg:order-1 lg:col-span-7"
          >
            <h2
              id="talent-pathways"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              Pathways for models & creatives
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                From runway and commercial modelling to MCs, stylists, and on-set creatives, talent
                work spans live events, brand campaigns, and awards programmes across Kenya. The
                strongest careers are built on preparation, reliability, and clear representation—
                not just a single casting call.
              </p>
              <p className="!text-left">
                Changer Fusions helps talent understand where they fit, how to present portfolio
                work, and how bookings move from brief to call sheet. Whether you are building
                experience or already working professionally, we focus on practical next steps that
                keep your opportunities organised and credible.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 w-full lg:order-2 lg:col-span-5"
          >
            <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-primary-100 sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl">
              <Image
                src={SECTION_IMAGE}
                alt="Models lined up on the runway — pathways for models and creatives at Changer Fusions"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 42vw"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
