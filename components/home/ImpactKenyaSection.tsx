"use client";

import { useEffect, useState } from "react";
import KenyaPresenceMap from "@/components/home/KenyaPresenceMap";
import AnimatedCount from "@/components/home/AnimatedCount";

const PLACES = ["the Coast", "Mombasa", "Nairobi", "Kisumu"] as const;

const STATS = [
  { value: 17000, suffix: "+", label: "People reached" },
  { value: 3, suffix: "", label: "Events & campaigns" },
  { value: 20, suffix: "", label: "Partnerships" },
  { value: 25, suffix: "", label: "Volunteer staff" },
] as const;

export default function ImpactKenyaSection() {
  const [placeIndex, setPlaceIndex] = useState(0);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return undefined;
    const timer = window.setInterval(() => {
      setPlaceIndex((current) => (current + 1) % PLACES.length);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      className="home-impact home-band home-band-ink home-arch w-full"
      aria-labelledby="home-impact-heading"
    >
      <div className="home-shell grid w-full items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <h2 id="home-impact-heading" className="home-display text-white">
            This work reaches{" "}
            <span className="text-secondary-300" aria-live="polite">
              {PLACES[placeIndex]}
            </span>
            .
          </h2>
          <p className="home-lead mt-6 max-w-xl text-white/75">
            From Mombasa and the Coast to Nairobi, Kisumu, and the rest of Kenya, planning,
            ticketing, and the day of the event stay on one workflow.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5">
            {STATS.map((stat, index) => (
              <li key={stat.label}>
                <p className="font-montserrat text-3xl font-medium tabular-nums text-white">
                  <AnimatedCount value={stat.value} suffix={stat.suffix} durationMs={1400 + index * 120} />
                </p>
                <p className="mt-1 text-sm text-white/70">{stat.label}</p>
              </li>
            ))}
          </ul>
        </div>
        <KenyaPresenceMap />
      </div>
    </section>
  );
}
