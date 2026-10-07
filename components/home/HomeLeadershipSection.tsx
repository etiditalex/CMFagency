"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const LEADERS = [
  {
    name: "Javan Rolynce",
    role: "Founder & Chief Executive Officer,",
    org: "Changer Fusions",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_thumb,g_face,z_0.62,w_900,h_1125,f_auto,q_auto/v1767009380/Javan_Roylence_a6fnzo.jpg",
    imageAlt: "Javan Rolynce, Founder and Chief Executive Officer of Changer Fusions",
  },
  {
    name: "Alex Etidit",
    role: "Technical Director,",
    org: "Changer Fusions",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_thumb,g_face,z_0.62,w_900,h_1125,f_auto,q_auto/v1768370403/Alex_Etidit-CTO_nkeiwj.jpg",
    imageAlt: "Alex Etidit, Technical Director of Changer Fusions",
  },
  {
    name: "Victoria Mapenzi",
    role: "Finance and Operations Director,",
    org: "Changer Fusions",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_thumb,g_face,z_0.62,w_900,h_1125,f_auto,q_auto/v1789386858/Victoria_h2bryf.jpg",
    imageAlt: "Victoria Mapenzi, Finance and Operations Director of Changer Fusions",
  },
] as const;

const HOLD_MS = 7000;
const FADE_CLASS = "duration-[1800ms]";

function LeaderPhoto({
  activeName,
  className,
}: {
  activeName: string;
  className: string;
}) {
  return (
    <div className={`overflow-hidden rounded-editorial shadow-editorial ${className}`}>
      {LEADERS.map((person) => (
        <div
          key={person.name}
          className={`absolute inset-0 transition-opacity ${FADE_CLASS} ease-in-out ${
            person.name === activeName ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={person.name !== activeName}
        >
          <Image
            src={person.image}
            alt={person.name === activeName ? person.imageAlt : ""}
            width={960}
            height={1200}
            className="h-full w-full object-cover object-[center_18%]"
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}

function LeaderCaption({ activeName }: { activeName: string }) {
  return (
    <div className="relative min-h-[4.5rem]">
      {LEADERS.map((person) => (
        <div
          key={person.name}
          className={`transition-opacity ${FADE_CLASS} ease-in-out ${
            person.name === activeName
              ? "relative opacity-100"
              : "pointer-events-none absolute inset-0 opacity-0"
          }`}
          aria-hidden={person.name !== activeName}
        >
          <p className="home-leadership-name font-inter text-base font-semibold text-editorial-strong sm:text-lg">
            {person.name}
          </p>
          <p className="home-leadership-role mt-0.5 font-inter text-sm font-normal leading-snug text-editorial-body">
            {person.role}
            <br />
            {person.org}
          </p>
        </div>
      ))}
    </div>
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

  const primary = LEADERS[index % LEADERS.length];
  const secondary = LEADERS[(index + 1) % LEADERS.length];

  return (
    <section
      ref={sectionRef}
      className="home-leadership w-full overflow-hidden bg-editorial-background py-12 sm:py-16 lg:py-20"
      aria-labelledby="home-leadership-heading"
    >
      <div className="mx-auto grid w-full max-w-[90rem] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16 lg:px-8">
        <div>
          <p className="sr-only">
            {LEADERS.map((leader) => `${leader.name}, ${leader.role} ${leader.org}`).join(" ")}
          </p>
          <div className="relative mx-auto w-full max-w-[36rem] pb-14 pr-2 sm:pb-20 sm:pr-8 lg:mx-0 lg:max-w-none">
            <span
              className="pointer-events-none absolute left-1 top-1 h-9 w-9 rounded-full border border-brand/35 sm:-left-1 sm:-top-8 sm:h-11 sm:w-11"
              aria-hidden
            />
            <LeaderPhoto
              activeName={primary.name}
              className="relative aspect-[4/5] w-[70%]"
            />
            <LeaderPhoto
              activeName={reduceMotion ? LEADERS[1].name : secondary.name}
              className="absolute bottom-0 right-0 z-10 aspect-[4/5] w-[46%]"
            />
          </div>

          <div
            className={`mt-6 grid gap-5 sm:mt-8 sm:gap-8 ${reduceMotion ? "sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}
            aria-hidden="true"
          >
            {reduceMotion ? (
              LEADERS.map((leader) => (
                <div key={leader.name}>
                  <p className="home-leadership-name font-inter text-base font-semibold text-editorial-strong">
                    {leader.name}
                  </p>
                  <p className="home-leadership-role mt-0.5 font-inter text-sm leading-snug text-editorial-body">
                    {leader.role}
                    <br />
                    {leader.org}
                  </p>
                </div>
              ))
            ) : (
              <>
                <LeaderCaption activeName={primary.name} />
                <LeaderCaption activeName={secondary.name} />
              </>
            )}
          </div>

          {!reduceMotion ? (
            <div className="mt-4 flex gap-1 md:hidden" role="group" aria-label="Leadership">
              {LEADERS.map((leader, leaderIndex) => (
                <button
                  key={leader.name}
                  type="button"
                  aria-label={`Show ${leader.name}`}
                  aria-current={index === leaderIndex ? "true" : undefined}
                  onClick={() => setIndex(leaderIndex)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center"
                >
                  <span
                    className={`block h-2.5 w-2.5 rounded-full ${
                      index === leaderIndex ? "bg-editorial-accent" : "bg-editorial-accent/40"
                    }`}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="type-eyebrow">Leadership</p>
          <h2 id="home-leadership-heading" className="type-section-heading mt-5 overflow-visible">
            Leadership at
            <br />
            Changer Fusions
          </h2>
          <div className="mt-6 space-y-5">
            <p className="type-body type-dropcap home-leadership-copy">
              We plan events, run digital marketing, and keep campaigns moving with{" "}
              <strong>Fusion Xpress</strong> so brands stay visible and relevant.
            </p>
            <p className="type-body home-leadership-copy">
              From first brief to last guest, our directors shape the work on the ground and the
              systems behind it—event design, campaign strategy, ticketing, voting, operations,
              finance, and the digital tools that keep a brand in the market after the room empties.
            </p>
            <p className="type-body home-leadership-copy">
              Technical leadership keeps <strong>Fusion Xpress</strong> and our platforms secure and
              ready to scale; operations leadership keeps delivery on time and on budget. From
              Mombasa across the Coast, Nairobi, Kisumu, and the rest of Kenya, Changer Fusions is
              led by people who stay close to the work: people, craft, and measurable growth.{" "}
              <strong>Market to thrive, Market to exist.</strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
