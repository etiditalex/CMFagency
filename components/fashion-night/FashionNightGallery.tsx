import Image from "next/image";

const PHOTOS = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037227/CoastFashionsandmodellingawards1_bdf13y.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards2_defemi.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards3_nw8dby.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards4_iuxpzz.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards5_ck7oxp.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards6_ivhbxz.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards7_gaptfq.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037228/CoastFashionsandmodellingawards10_zl8o43.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards12_cfsz68.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037230/CoastFashionsandmodellingawards13_g3wcsz.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards14_mqjq7b.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037230/CoastFashionsandmodellingawards15_tncu7p.jpg",
] as const;

export default function FashionNightGallery() {
  return (
    <section
      className="fashion-night-gallery w-full overflow-x-clip bg-white pt-10 sm:pt-16 lg:pt-20"
      aria-labelledby="fashion-night-gallery-heading"
    >
      <h2 id="fashion-night-gallery-heading">Gallery</h2>
      <span className="mx-auto mt-3 block h-[3px] w-12 bg-[#c6a04a]" aria-hidden />
      <ul className="fn-gallery-grid mt-6 grid w-full grid-cols-2 gap-1 sm:mt-8 sm:grid-cols-3 lg:grid-cols-4">
        {PHOTOS.map((src, index) => (
          <li key={src} className="fn-gallery-item aspect-[4/3]">
            <Image
              src={src}
              alt={`Coast Fashion and Modelling Awards 2025 photo ${index + 1}`}
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
