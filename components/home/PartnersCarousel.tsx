"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary";

const partnerLogos = [
  {
    id: 1,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159309/Patrners_2_vad9x7.jpg",
    alt: "Partner 1",
  },
  {
    id: 2,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_3_h6mjkl.jpg",
    alt: "Partner 2",
  },
  {
    id: 3,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_1_llldgx.jpg",
    alt: "Partner 3",
  },
  {
    id: 4,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_4_vujwiy.jpg",
    alt: "Partner 4",
  },
];

// Duplicate logos for seamless infinite scroll
const duplicatedLogos = [...partnerLogos, ...partnerLogos, ...partnerLogos];

export default function PartnersCarousel() {
  return (
    <section className="section-padding bg-gradient-to-br from-gray-50 to-white">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Our Partners
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Trusted by leading brands and organizations
          </p>
        </motion.div>

        {/* Infinite Scrolling Carousel */}
        <div className="relative overflow-hidden">
          <div className="flex animate-scroll">
            {duplicatedLogos.map((partner, index) => (
              <div
                key={`${partner.id}-${index}`}
                className="flex-shrink-0 mx-4 md:mx-8 lg:mx-12"
              >
                <div className="relative w-48 md:w-64 lg:w-80 h-32 md:h-40 lg:h-48 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 flex items-center justify-center border border-gray-100">
                  <Image
                    loader={cloudinaryLoader}
                    src={partner.image}
                    alt={partner.alt}
                    fill
                    className="object-contain"
                    sizes="320px"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
