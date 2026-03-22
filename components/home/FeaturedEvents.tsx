"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { getEventPathById } from "@/lib/event-slugs";
import { cloudinaryLoader } from "@/lib/cloudinary";
import { montserrat } from "@/lib/fonts";

/** Gallery picks: crowds and real moments (same Cloudinary URLs as HomeGalleryCarousel). */
const featuredEvents = [
  {
    id: 12,
    title: "Corporate Sponsorship Launch",
    description:
      "Stakeholders, partners, and teams coming together for our corporate sponsorship unveiling—strategy, trust, and shared growth on stage.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards2_defemi.jpg",
    imageAlt:
      "Large audience and stage at a Changer Fusions awards and corporate event",
  },
  {
    id: 11,
    title: "Marketing Campaign Launch",
    description:
      "A room full of energy: launches, speakers, and networking where brands meet the people who bring campaigns to life.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_2_adeysa.jpg",
    imageAlt: "Guests seated at a Global Women Impact event hosted by Changer Fusions",
  },
  {
    id: 15,
    title: "Leadership Development Seminar",
    description:
      "Full-day learning with professionals in the room—workshops, panels, and peer connection, not slides in a void.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767154665/The_Kings_Experience_8_jjuk4p.jpg",
    imageAlt: "Crowd of attendees at The Kings Experience seminar and gathering",
  },
  {
    id: 13,
    title: "Joint Promotional Launch",
    description:
      "Runways, lights, and a packed house—promotional launches built around people, presence, and shared celebration.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448263/HighFashionAudition20251_ufpxud.jpg",
    imageAlt: "Fashion audition with many models and audience on the runway floor",
  },
];

function SectionWave() {
  return (
    <div
      className="pointer-events-none w-full overflow-hidden leading-[0] text-gray-50"
      aria-hidden
    >
      <svg
        className="relative block h-9 w-full md:h-12"
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="currentColor"
          d="M0,32 C150,8 350,52 600,28 C850,4 1050,48 1200,26 L1200,60 L0,60 Z"
        />
      </svg>
    </div>
  );
}

export default function FeaturedEvents() {
  return (
    <section className="relative bg-gray-50 pb-16 md:pb-24">
      <SectionWave />

      <div className="container-custom pt-2 md:pt-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center md:mb-12"
        >
          <h2
            className={`${montserrat.className} text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl lg:text-[2.35rem]`}
          >
            Featured events
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-base text-gray-600">
            Real rooms, real audiences—highlights from the experiences we build with our community.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {featuredEvents.map((event, index) => {
            const href = getEventPathById(event.id) ?? "/events";

            return (
              <motion.article
                key={event.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="group flex h-full flex-col"
              >
                <Link
                  href={href}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm transition-[box-shadow,border-color] duration-300 hover:border-primary-200 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100">
                    <Image
                      loader={cloudinaryLoader}
                      src={event.image}
                      alt={event.imageAlt}
                      fill
                      className="object-contain object-center p-1.5 sm:p-2"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-6 text-center">
                    <h3
                      className={`${montserrat.className} text-lg font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary-700 md:text-[1.05rem]`}
                    >
                      {event.title}
                    </h3>
                    <p className="mt-3 flex-1 text-center text-sm leading-relaxed text-gray-600">
                      {event.description}
                    </p>
                  </div>
                </Link>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
