"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const LEADERS = [
  {
    name: "Javan Rolynce",
    role: "Founder & Chief Executive Officer,",
    org: "Changer Fusions",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_256,h_256,f_auto,q_auto/v1767009380/Javan_Roylence_a6fnzo.jpg",
    imageAlt: "Javan Rolynce, Founder and Chief Executive Officer of Changer Fusions",
  },
  {
    name: "Alex Etidit",
    role: "Technical Director,",
    org: "Changer Fusions",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_256,h_256,f_auto,q_auto/v1768370403/Alex_Etidit-CTO_nkeiwj.jpg",
    imageAlt: "Alex Etidit, Technical Director of Changer Fusions",
  },
  {
    name: "Victoria Mapenzi",
    role: "Finance and Operations Director,",
    org: "Changer Fusions",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_256,h_256,f_auto,q_auto/v1789386858/Victoria_h2bryf.jpg",
    imageAlt: "Victoria Mapenzi, Finance and Operations Director of Changer Fusions",
  },
] as const;

const HOLD_MS = 7000;
const FADE_CLASS = "duration-[1800ms]";

function LeaderSlot({
  leader,
  className = "",
}: {
  leader: (typeof LEADERS)[number];
  className?: string;
}) {
  return (
    <li className={`relative mx-auto flex w-full max-w-[22rem] items-center gap-3 text-left sm:mx-0 sm:w-[22rem] sm:gap-4 ${className}`}>
      <div className="relative h-20 w-20 shrink-0 sm:h-28 sm:w-28">
        {LEADERS.map((person) => (
          <div
            key={person.name}
            className={`absolute inset-0 overflow-hidden rounded-full ring-[3px] ring-white transition-opacity ${FADE_CLASS} ease-in-out ${
              person.name === leader.name ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={person.name !== leader.name}
          >
            <Image
              src={person.image}
              alt={person.name === leader.name ? person.imageAlt : ""}
              width={256}
              height={256}
              className="h-full w-full object-cover object-center"
              unoptimized
            />
          </div>
        ))}
      </div>
      <div className="relative min-h-[3.75rem] flex-1 sm:min-h-[4.25rem]">
        {LEADERS.map((person) => (
          <div
            key={person.name}
            className={`transition-opacity ${FADE_CLASS} ease-in-out ${
              person.name === leader.name
                ? "relative opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0"
            }`}
            aria-hidden={person.name !== leader.name}
          >
            <p className="home-leadership-name font-montserrat text-base font-bold text-white sm:text-xl">
              {person.name}
            </p>
            <p className="home-leadership-role mt-0.5 text-[0.8rem] leading-snug text-white/90 sm:text-[0.95rem]">
              {person.role}
              <br />
              {person.org}
            </p>
          </div>
        ))}
      </div>
    </li>
  );
}

export default function HomeLeadershipSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(motionQuery.matches);
    sync();
    motionQuery.addEventListener("change", sync);
    return () => motionQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const section = sectionRef.current;
    if (!section) return undefined;

    let timer: number | undefined;
    const start = () => {
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % LEADERS.length);
      }, HOLD_MS);
    };
    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = undefined;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0.35 }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [reduceMotion]);

  const visible = reduceMotion
    ? LEADERS
    : [LEADERS[index % LEADERS.length], LEADERS[(index + 1) % LEADERS.length]];

  return (
    <section
      ref={sectionRef}
      className="home-leadership w-full bg-gradient-to-r from-secondary-500 via-primary-800 to-primary-950 py-8 sm:py-16 lg:py-20"
      aria-labelledby="home-leadership-heading"
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <h2
          id="home-leadership-heading"
          className="font-montserrat text-[1.65rem] font-bold leading-tight text-white sm:text-4xl md:text-5xl"
        >
          Leadership at Changer Fusions
        </h2>
      </div>
      <p className="home-leadership-copy mx-auto mt-4 w-full max-w-none px-4 text-center text-[0.9rem] leading-relaxed text-white/95 sm:mt-7 sm:px-6 sm:text-xl sm:leading-relaxed md:px-8 md:text-2xl md:leading-[1.55] lg:px-10 lg:text-[1.65rem] lg:leading-[1.5]">
        We plan events, run digital marketing, and keep campaigns moving with Fusion Xpress so
        brands stay visible and relevant. From first brief to last guest, our directors shape the
        work on the ground and the systems behind it—event design, campaign strategy, ticketing,
        voting, operations, finance, and the digital tools that keep a brand in the market after
        the room empties. Technical leadership keeps Fusion Xpress and our platforms secure and
        ready to scale; operations leadership keeps delivery on time and on budget. From Mombasa
        across the Coast, Nairobi, Kisumu, and the rest of Kenya, Changer Fusions is led by people
        who stay close to the work: people, craft, and measurable growth. Market to thrive, Market
        to exist.
      </p>

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <p className="sr-only">
          {LEADERS.map((leader) => `${leader.name}, ${leader.role} ${leader.org}`).join(" ")}
        </p>

        <ul
          className={`mt-6 flex w-full flex-col items-stretch justify-center gap-5 sm:mt-12 sm:flex-row sm:items-center sm:gap-12 md:gap-16 ${
            reduceMotion ? "lg:gap-10" : ""
          }`}
          aria-hidden="true"
        >
          {visible.map((leader, slot) => (
            <LeaderSlot
              key={reduceMotion ? leader.name : `slot-${slot}`}
              leader={leader}
              className={!reduceMotion && slot > 0 ? "hidden sm:flex" : undefined}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
