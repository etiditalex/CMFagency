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
  {
    id: 5,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777897771/WhatsApp_Image_2026-05-03_at_16.30.43_jiwrxe.jpg",
    alt: "CityBlue Hotels",
  },
  {
    id: 6,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777897771/WhatsApp_Image_2026-05-03_at_16.30.43_1_qxxeml.jpg",
    alt: "Letsvoice Podcast",
  },
  {
    id: 7,
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777897771/WhatsApp_Image_2026-05-03_at_16.30.42_thnno6.jpg",
    alt: "Partner logo",
  },
];

export default function PartnersCarousel() {
  return (
    <section className="w-full bg-gradient-to-br from-gray-50 to-white py-10 sm:py-14 md:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:max-w-none lg:px-10 xl:px-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center sm:mb-10 md:mb-12"
        >
          <h2 className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl lg:text-5xl">
            Our Partners
          </h2>
        </motion.div>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 xl:gap-5">
          {partnerLogos.map((partner) => (
            <div
              key={partner.id}
              className="relative flex h-24 items-center justify-center rounded-lg border border-gray-100 bg-white p-2 shadow-md sm:h-28 sm:p-3 md:h-32 lg:h-36 xl:h-40"
            >
              <Image
                loader={cloudinaryLoader}
                src={partner.image}
                alt={partner.alt}
                fill
                className="object-contain p-2 sm:p-3"
                sizes="(min-width: 1280px) 14vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
