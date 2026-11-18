"use client";

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
    <section className="home-partners w-full bg-[#e5f3f7] pb-16 pt-2" aria-labelledby="home-partners-heading">
      <div className="home-shell">
        <h2 id="home-partners-heading" className="mb-8 font-montserrat text-2xl font-medium tracking-tight text-primary-950">
          Partners
        </h2>

        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {partnerLogos.map((partner) => (
            <div
              key={partner.id}
              className="relative flex h-24 items-center justify-center rounded-2xl bg-white/70 p-3"
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
