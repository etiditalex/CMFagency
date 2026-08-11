"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const COLLAGE_IMAGES = [
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360469/careers_mtyoxg.jpg",
    alt: "Changer Fusions team collaborating on career growth in Kenya",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1786360874/career_assistance_zcuimx.jpg",
    alt: "Career mentoring and internship guidance at Changer Fusions",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg",
    alt: "Fashion and modelling attachment opportunities with Changer Fusions",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    alt: "Events and marketing job experience through Changer Fusions",
  },
] as const;

export default function EmployingWithChangerFusions() {
  return (
    <section
      className="careers-about w-full bg-primary-50 py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="building-careers-changer-fusions"
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
              id="building-careers-changer-fusions"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              Building careers with Changer Fusions
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                Changer Fusions advocates for practical career pathways — not just conversations
                about jobs. Through{" "}
                <strong className="font-semibold text-gray-900">attachments</strong>,{" "}
                <strong className="font-semibold text-gray-900">internships</strong>, and{" "}
                <strong className="font-semibold text-gray-900">full-time roles</strong>, we help
                young professionals and growing teams gain real experience across marketing,
                fashion, events, and education.
              </p>
              <p className="!text-left">
                When organisations partner with us, they gain access to motivated talent supported
                by{" "}
                <strong className="font-semibold text-gray-900">career development</strong> and
                training. We prepare people with the skills, confidence, and industry exposure
                needed to contribute from day one — while giving employers a clearer route to
                hire, mentor, and retain the right people.
              </p>
              <p className="!text-left">
                Whether you are building a team or shaping your own future, Changer Fusions
                connects opportunity with readiness. We stand for inclusive growth, professional
                excellence, and careers that create lasting impact for individuals and businesses
                across Kenya.
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
