"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const SECTION_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448264/HighFashionAudition20255_dwiebf.jpg";

export default function HowToWorkWithUs() {
  return (
    <section
      className="talent-about w-full bg-white py-10 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="how-to-work-with-us"
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
                alt="Model casting and talent booking process with Changer Fusions"
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
              id="how-to-work-with-us"
              className="!text-left font-montserrat text-xl font-bold tracking-tight text-gray-900 sm:text-3xl md:text-4xl"
            >
              How to work with us
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 sm:mt-6 sm:text-base md:text-[1.05rem] md:leading-[1.7]">
              <p className="!text-left">
                <strong className="font-semibold text-gray-900">General talent pool:</strong>{" "}
                <Link
                  href="/application"
                  className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
                >
                  Submit an application
                </Link>{" "}
                with your experience, location, and portfolio links so our bookings team can match
                you to suitable work.
              </p>
              <p className="!text-left">
                <strong className="font-semibold text-gray-900">Awards or event categories:</strong>{" "}
                <Link
                  href="/events/register-as-model"
                  className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
                >
                  Register for the relevant programme
                </Link>{" "}
                when registrations are open, and follow the instructions for photos, payments (if
                any), and voting links. Category registration is handled through the dedicated
                event flow—not a public directory of every participant.
              </p>
              <p className="!text-left">
                <strong className="font-semibold text-gray-900">Brand or corporate bookings:</strong>{" "}
                email{" "}
                <a
                  href="mailto:info@cmfagency.co.ke"
                  className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
                >
                  info@cmfagency.co.ke
                </a>{" "}
                or use{" "}
                <Link
                  href="/contact"
                  className="font-medium text-secondary-600 underline underline-offset-2 transition-colors hover:text-secondary-700"
                >
                  Contact
                </Link>{" "}
                with scope, dates, and budget band—we will respond with availability and next steps.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
