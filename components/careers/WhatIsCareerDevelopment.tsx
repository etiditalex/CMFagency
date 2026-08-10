"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const SECTION_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

export default function WhatIsCareerDevelopment() {
  return (
    <section
      className="careers-about w-full bg-white py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="what-is-career-development"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:col-span-5"
          >
            <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-primary-100 sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl">
              <Image
                src={SECTION_IMAGE}
                alt="Career development at Changer Fusions — more than talking about jobs"
                fill
                className="object-cover object-center"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 42vw"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="w-full lg:col-span-7"
          >
            <h2
              id="what-is-career-development"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              What is Career Development
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                Career development is the lifelong process of managing and advancing your career over
                time. It involves acquiring new skills, knowledge, and experiences, as well as making
                strategic decisions and taking actions to enhance professional growth and achieve
                long-term career goals.
              </p>
              <p className="!text-left">
                Career development professionals specialize in helping individuals navigate their
                career paths, make informed decisions, and develop strategies to achieve their career
                goals. Those providing career development support may be careers assistants, careers
                advisers, careers leaders, careers coaches, career counsellors, careers consultants or
                career development experts.
              </p>
            </div>

            <p className="!text-left mt-5 text-sm text-gray-800 sm:mt-6 sm:text-base">
              Learn more about{" "}
              <Link
                href="/career"
                className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
              >
                the career development profession.
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
