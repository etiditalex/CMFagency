"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cloudinaryLoader } from "@/lib/cloudinary";

const NAMES = ["CityBlue Hotels", "Letsvoice Podcast"] as const;

const LOGOS = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159309/Patrners_2_vad9x7.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_3_h6mjkl.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_1_llldgx.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767159308/Patrners_4_vujwiy.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777897771/WhatsApp_Image_2026-05-03_at_16.30.43_jiwrxe.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777897771/WhatsApp_Image_2026-05-03_at_16.30.43_1_qxxeml.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1777897771/WhatsApp_Image_2026-05-03_at_16.30.42_thnno6.jpg",
] as const;

export default function AugustEventSection() {
  const [nameIndex, setNameIndex] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return undefined;
    const timer = window.setInterval(() => {
      setNameIndex((current) => (current + 1) % NAMES.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const rail = [...LOGOS, ...LOGOS];

  return (
    <section
      id="home-story"
      className="home-august-event home-band home-band-paper home-arch home-arch-first overflow-x-clip"
      aria-labelledby="home-august-event-heading"
    >
      <div className="home-shell">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[minmax(16rem,0.42fr)_minmax(0,0.58fr)] lg:gap-20">
          <div>
            <p className="home-giant" aria-hidden>
              17,000+
            </p>
            <p className="home-giant-word">reached</p>
          </div>
          <div>
            <h2 id="home-august-event-heading" className="sr-only">
              Event planning, ticketing, and smart systems
            </h2>
            <div className="home-lead max-w-xl space-y-4 text-primary-900/85">
              <p>
                Changer Fusions plans and manages events from the first brief to the last guest.
                Fusion Xpress covers ticketing and voting for shows, launches, awards, and fan
                programmes, so a ticket sale and a vote sit in the same place.
              </p>
              <p>
                Planning, ticketing, voting, and day-of management stay on one workflow, including
              </p>
            </div>
            <p className="mt-6 font-montserrat text-2xl font-medium tracking-tight text-primary-950" aria-live="polite">
              {NAMES[nameIndex]}
            </p>
            <Link href="/about" className="home-text-link mt-2 text-primary-800">
              and many more <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="home-logo-viewport mt-14" aria-label="Partners">
        <div className="home-logo-rail px-4">
          {rail.map((src, index) => (
            <div key={`${src}-${index}`} className="flex h-24 w-40 items-center justify-center rounded-2xl bg-white/80 px-3">
              <Image
                loader={cloudinaryLoader}
                src={src}
                alt=""
                width={160}
                height={72}
                className="h-16 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
