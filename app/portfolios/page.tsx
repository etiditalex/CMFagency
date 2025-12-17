"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// Gallery images using real Cloudinary images
const galleryImages = [
  {
    id: 1,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9922_mbb7gc.jpg",
    alt: "Event Gallery Image 1",
  },
  {
    id: 2,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9942_jmpqcq.jpg",
    alt: "Event Gallery Image 2",
  },
  {
    id: 3,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892267/IMG_9940_btsrbk.jpg",
    alt: "Event Gallery Image 3",
  },
  {
    id: 4,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    alt: "Event Gallery Image 4",
  },
  {
    id: 5,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892264/IMG_9921_rccldq.jpg",
    alt: "Event Gallery Image 5",
  },
  {
    id: 6,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9937_v0nwkr.jpg",
    alt: "Event Gallery Image 6",
  },
  {
    id: 7,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9856_x8kq7w.jpg",
    alt: "Event Gallery Image 7",
  },
  {
    id: 8,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892265/IMG_9925_t4co5j.jpg",
    alt: "Event Gallery Image 8",
  },
  {
    id: 9,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9817_qlxozr.jpg",
    alt: "Event Gallery Image 9",
  },
  {
    id: 10,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0331_zz7s2k.jpg",
    alt: "Event Gallery Image 10",
  },
  {
    id: 11,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0320_xc3kuq.jpg",
    alt: "Event Gallery Image 11",
  },
  {
    id: 12,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0373_e07xid.jpg",
    alt: "Event Gallery Image 12",
  },
  {
    id: 13,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892257/IMG_0340_alj30p.jpg",
    alt: "Event Gallery Image 13",
  },
  {
    id: 14,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892263/IMG_9855_tpqcuh.jpg",
    alt: "Event Gallery Image 14",
  },
  {
    id: 15,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892262/IMG_9853_ys9f08.jpg",
    alt: "Event Gallery Image 15",
  },
  {
    id: 16,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892260/IMG_00521_kil1g0.jpg",
    alt: "Event Gallery Image 16",
  },
  {
    id: 17,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892259/IMG_0391_grwhq3.jpg",
    alt: "Event Gallery Image 17",
  },
  {
    id: 18,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0319_e1wrwf.jpg",
    alt: "Event Gallery Image 18",
  },
  {
    id: 19,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892258/IMG_0389_jdgcfx.jpg",
    alt: "Event Gallery Image 19",
  },
  {
    id: 20,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892256/IMG_0372_yzwijt.jpg",
    alt: "Event Gallery Image 20",
  },
  {
    id: 21,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892255/IMG_0315_bxgrqg.jpg",
    alt: "Event Gallery Image 21",
  },
  {
    id: 22,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892261/IMG_9818_z7o3uu.jpg",
    alt: "Event Gallery Image 22",
  },
  {
    id: 23,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892260/IMG_0407_vmrpxn.jpg",
    alt: "Event Gallery Image 23",
  },
  {
    id: 24,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892252/IMG_0314_hxbjtk.jpg",
    alt: "Event Gallery Image 24",
  },
  {
    id: 25,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892252/IMG_0310_lemh6v.jpg",
    alt: "Event Gallery Image 25",
  },
  {
    id: 26,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892250/IMG_0241_h6bfpv.jpg",
    alt: "Event Gallery Image 26",
  },
  {
    id: 27,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892249/IMG_0300_tleord.jpg",
    alt: "Event Gallery Image 27",
  },
  {
    id: 28,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892247/IMG_0298_ormqnp.jpg",
    alt: "Event Gallery Image 28",
  },
  {
    id: 29,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892247/IMG_0235_cfpyap.jpg",
    alt: "Event Gallery Image 29",
  },
  {
    id: 30,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892248/IMG_0175_gwvb2a.jpg",
    alt: "Event Gallery Image 30",
  },
  {
    id: 31,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892245/IMG_0228_eh3xjb.jpg",
    alt: "Event Gallery Image 31",
  },
  {
    id: 32,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892249/IMG_0301_esk2ls.jpg",
    alt: "Event Gallery Image 32",
  },
  {
    id: 33,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892244/IMG_0296_mobtj1.jpg",
    alt: "Event Gallery Image 33",
  },
  {
    id: 34,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892246/IMG_0210_mlhgac.jpg",
    alt: "Event Gallery Image 34",
  },
  {
    id: 35,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892251/IMG_0312_g9tiod.jpg",
    alt: "Event Gallery Image 35",
  },
  {
    id: 36,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892252/IMG_0302_dhgo5m.jpg",
    alt: "Event Gallery Image 36",
  },
  {
    id: 37,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892245/IMG_0297_c59tkd.jpg",
    alt: "Event Gallery Image 37",
  },
  {
    id: 38,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892248/IMG_0299_zqnhuz.jpg",
    alt: "Event Gallery Image 38",
  },
  {
    id: 39,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892244/IMG_0191_bhzzk0.jpg",
    alt: "Event Gallery Image 39",
  },
  {
    id: 40,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892244/IMG_0127_xedz7c.jpg",
    alt: "Event Gallery Image 40",
  },
  {
    id: 41,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892240/IMG_0287_hptjfy.jpg",
    alt: "Event Gallery Image 41",
  },
  {
    id: 42,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892242/IMG_0153_br7lhk.jpg",
    alt: "Event Gallery Image 42",
  },
  {
    id: 43,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892240/IMG_0117_yrimdt.jpg",
    alt: "Event Gallery Image 43",
  },
  {
    id: 44,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892240/IMG_0053_gqzcn6.jpg",
    alt: "Event Gallery Image 44",
  },
  {
    id: 45,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892238/IMG_0051_el3qiu.jpg",
    alt: "Event Gallery Image 45",
  },
  {
    id: 46,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892238/IMG_0078_oyseun.jpg",
    alt: "Event Gallery Image 46",
  },
  {
    id: 47,
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892238/IMG_0256_qitv8u.jpg",
    alt: "Event Gallery Image 47",
  },
];

export default function PortfoliosPage() {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <section className="section-padding">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Gallery
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Visual showcase of our events, projects, and memorable moments
            </p>
          </motion.div>

          {/* Image Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
