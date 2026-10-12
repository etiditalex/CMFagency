import Image from "next/image";

const PHOTOS = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_1_ulwmpe.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_2_uv3ywv.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_3_kv10pr.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840048/2026_Coast_Fashion_Show_4_fozlhq.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840048/2026_Coast_Fashion_Show_5_d4elgf.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840048/2026_Coast_Fashion_Show_6_hvh1pq.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_7_kmoxak.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_8_wgu5fv.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_9_dry46w.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840048/2026_Coast_Fashion_Show_10_lplf05.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_11_ddgqsf.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_12_v1ugvw.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_13_y6zagt.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_14_awlsuc.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840049/2026_Coast_Fashion_Show_15_wsquzi.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_16_mouuhm.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1791840047/2026_Coast_Fashion_Show_17_lnd27d.jpg",
] as const;

export default function FashionShowGallery() {
  return (
    <section
      className="fashion-night-gallery w-full overflow-x-clip bg-white pt-10 sm:pt-16 lg:pt-20"
      aria-labelledby="fashion-show-gallery-heading"
    >
      <h2 id="fashion-show-gallery-heading">Gallery</h2>
      <span className="mx-auto mt-3 block h-[3px] w-12 bg-[#c6a04a]" aria-hidden />
      <ul className="fn-gallery-grid mt-6 grid w-full grid-cols-2 gap-1 sm:mt-8 sm:grid-cols-3 lg:grid-cols-4">
        {PHOTOS.map((src, index) => (
          <li key={src} className="fn-gallery-item aspect-[4/3]">
            <Image
              src={src}
              alt={`2026 Fashion Show photo ${index + 1}`}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
