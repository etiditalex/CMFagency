"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cloudinaryLoader } from "@/lib/cloudinary";
import GalleryLightbox from "@/components/GalleryLightbox";

const PHOTOS = [
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396193/Homepage_4_qik5ts.jpg",
    alt: "Talent seated before a Changer Fusions show",
    kicker: "Changer Fusions · 2026",
    caption: "Coast Fashion and Modelling Awards",
    lead: true,
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_3_puyiot.jpg",
    alt: "Models on stage at a Coast fashion show",
    kicker: "Mombasa",
    caption: "Runway on the Coast",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396193/Homepage_2_pfpccl.jpg",
    alt: "Participants in a Changer Fusions workshop",
    kicker: "Careers",
    caption: "Workshop and pathways",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_5_ut7g6w.jpg",
    alt: "Guests seated together at a Changer Fusions gathering",
    kicker: "Events",
    caption: "Guests at the table",
  },
  {
    src: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_1_n4ow6e.jpg",
    alt: "Videographer filming a Changer Fusions event",
    kicker: "Campaigns",
    caption: "Filming the day",
  },
] as const;

export default function HomeEventCuration() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const images = PHOTOS.map((photo) => ({
    src: photo.src,
    alt: photo.alt,
  }));

  return (
    <section className="home-show home-band home-band-paper home-arch" aria-labelledby="home-show-heading">
      <div className="home-shell">
        <div className="home-show-head">
          <div>
            <h2 id="home-show-heading" className="home-display text-primary-950">
              Coast Fashion and Modelling Awards <em>2026</em>
            </h2>
            <p className="home-lead mt-5 max-w-xl text-primary-900/80">
              A night for coastal heritage, youth talent, and sustainable fashion, held on 15 August 2026
              at City Blue Creekside Hotel, Mombasa.
            </p>
          </div>
          <Link href="/2026-fashion-show" className="home-notes-all">
            All photos <span aria-hidden>→</span>
          </Link>
        </div>

        <ul className="home-board">
          {PHOTOS.map((photo, index) => (
            <li key={photo.src} className={photo.lead ? "home-tile home-tile-lead" : "home-tile"}>
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="home-tile-btn"
                aria-label={`Open photo: ${photo.caption}`}
              >
                <span className="home-tile-ph">
                  <Image
                    loader={cloudinaryLoader}
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    quality={90}
                    className="object-cover object-center"
                    sizes={photo.lead ? "(min-width: 900px) 40vw, 100vw" : "(min-width: 900px) 28vw, 100vw"}
                  />
                </span>
                <span className="home-tile-tx">
                  <span className="home-tile-who">{photo.kicker}</span>
                  <strong>{photo.caption}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="relative mt-12 aspect-video w-full overflow-hidden rounded-[1.75rem] bg-primary-950">
          <iframe
            className="absolute inset-0 h-full w-full"
            src="https://www.youtube.com/embed/IxGC31vxQtU"
            title="Changer Fusions on YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>

      <GalleryLightbox
        images={images}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChangeIndex={setLightboxIndex}
        label="2026 fashion show photo"
      />
    </section>
  );
}
