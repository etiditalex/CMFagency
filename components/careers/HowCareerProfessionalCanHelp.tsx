"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const SECTION_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360874/career_assistance_zcuimx.jpg";

export default function HowCareerProfessionalCanHelp() {
  return (
    <section
      className="careers-about w-full bg-white py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="how-career-professional-can-help"
    >
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="grid w-full grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 w-full lg:order-1 lg:col-span-5"
          >
            <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl bg-primary-100 sm:aspect-[4/3] sm:rounded-2xl lg:rounded-3xl">
              <Image
                src={SECTION_IMAGE}
                alt="Career assistance and mentoring with a career development professional"
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
            className="order-1 w-full lg:order-2 lg:col-span-7"
          >
            <h2
              id="how-career-professional-can-help"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              How a career professional can help you
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                Having a career development conversation with a qualified Career Development
                Professional gives you the opportunity for a confidential, unbiased discussion
                focused on you. It can help you to build career development skills to use throughout
                your life as your situation and the world around you changes.
              </p>
              <p className="!text-left">
                Registered Career Development Professionals are qualified to at least graduate level
                to provide careers advice and guidance to people of all ages and from all
                communities. They can help you to consider your circumstances, values and
                aspirations; confront any challenges; strengthen motivation; build resilience,
                confidence and curiosity; develop new perspectives; learn about labour market
                information and opportunities; and create practical plans to move forward in your
                career.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
