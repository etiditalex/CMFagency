"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const STORIES = [
  {
    name: "Amina Wanjiku",
    role: "Marketing Lead, Coastal Brands",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892261/IMG_9817_qlxozr.jpg",
    quote:
      "Working with Changer Fusions on our launch week changed how we show up. They planned the room, ran the campaign, and kept guests moving through Fusion Xpress without us chasing three vendors. Briefings, guest flow, and the posts that followed all sat in one plan, so the brand felt the same in the hall and on the phone the next morning.",
  },
  {
    name: "Brian Otieno",
    role: "Founder, Studio North",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892256/IMG_0331_zz7s2k.jpg",
    quote:
      "We needed an event that still worked online the next morning. Their team treated ticketing, content, and the live moment as one brief. The run of show was clear, the campaign stayed live after last call, and we did not have to rebuild the story for social from scratch.",
  },
  {
    name: "Faith Chebet",
    role: "Talent, Coast programme",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1768448263/HighFashionAudition20251_ufpxud.jpg",
    quote:
      "From audition floor to the awards night, the process was clear. I always knew the next step, and the team treated talent with the same care they give the brand on stage. Call times, looks, and the live moment were written down, so nobody was guessing, and the show still felt personal when the lights came up.",
  },
  {
    name: "Daniel Mwangi",
    role: "Operations Manager",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892258/IMG_0373_e07xid.jpg",
    quote:
      "Run-of-show, vendors, and guest flow stayed tight. Changer Fusions made a complex day feel simple for our staff and for the people walking in the door. Radios, timings, and the last-minute changes all came through one desk, which meant the floor stayed calm even when the programme shifted.",
  },
  {
    name: "Lillian Achieng",
    role: "Campaign Client",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1767153675/Global_women_impact_2_adeysa.jpg",
    quote:
      "The digital work did not stop when the event ended. Posts, tickets, and follow-up sat in one place, so the brand stayed visible after the last guest left. We could see who came, who voted, and what to send next week without opening five tools, which is the part of the brief we keep coming back to.",
  },
  {
    name: "Peter Kamau",
    role: "Events Partner",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1765892255/IMG_0320_xc3kuq.jpg",
    quote:
      "We asked for a partner who could plan, promote, and measure. Changer Fusions did the three together, which is why we keep coming back. The event brief, the Fusion Xpress tickets, and the campaign report arrived as one thread, so our team spent the week on guests instead of chasing files.",
  },
] as const;

const HOLD_MS = 7000;
const FADE_CLASS = "duration-[1800ms]";
const VISIBLE = 3;

function StorySlot({
  story,
  className = "",
}: {
  story: (typeof STORIES)[number];
  className?: string;
}) {
  return (
    <article
      className={`relative min-h-[28rem] overflow-y-auto rounded-xl bg-secondary-800 sm:min-h-[28rem] sm:overflow-hidden lg:min-h-[32rem] ${className}`}
    >
      {STORIES.map((person) => (
        <div
          key={person.name}
          className={`absolute inset-0 flex flex-col overflow-hidden px-4 py-6 transition-opacity ${FADE_CLASS} ease-in-out sm:px-6 sm:py-8 lg:px-7 lg:py-9 ${
            person.name === story.name ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={person.name !== story.name}
        >
          <div className="mb-3 flex items-center gap-3 sm:mb-6 sm:gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30 sm:h-16 sm:w-16">
              <Image
                src={person.image}
                alt=""
                width={160}
                height={160}
                className="h-full w-full object-cover object-center"
                unoptimized
              />
            </div>
            <div className="min-w-0">
              <h3 className="font-montserrat text-base font-bold leading-tight text-white sm:text-xl">
                {person.name}
              </h3>
              <p className="home-success-role mt-0.5 text-xs leading-snug text-white/80 sm:text-sm">{person.role}</p>
            </div>
          </div>
          <p className="home-success-quote flex-1 text-[0.9rem] leading-relaxed text-white sm:text-[1.05rem] sm:leading-7 lg:text-lg lg:leading-8">
            &lsquo;{person.quote}&rsquo;
          </p>
        </div>
      ))}
    </article>
  );
}

export default function HomeSuccessStoriesSection() {
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
        setIndex((current) => (current + 1) % STORIES.length);
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

  const visible = Array.from({ length: VISIBLE }, (_, slot) => STORIES[(index + slot) % STORIES.length]);

  return (
    <section
      ref={sectionRef}
      className="home-success w-full bg-secondary-500 py-10 sm:py-20 md:py-24 lg:py-28"
      aria-labelledby="home-success-heading"
    >
      <h2
        id="home-success-heading"
        className="mb-6 overflow-visible px-4 font-montserrat text-[1.55rem] font-bold leading-snug text-white sm:mb-12 sm:text-4xl md:mb-14 md:text-5xl"
      >
        Success Stories
      </h2>

      <p className="sr-only">
        {STORIES.map((story) => `${story.name}, ${story.role}. ${story.quote}`).join(" ")}
      </p>

      <div
        className="mx-auto grid w-full grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-3 md:gap-5 md:px-8 lg:px-10"
        aria-hidden="true"
      >
        {(reduceMotion ? STORIES.slice(0, VISIBLE) : visible).map((story, slot) => (
          <StorySlot
            key={reduceMotion ? story.name : `slot-${slot}`}
            story={story}
            className={slot > 0 ? "hidden md:block" : undefined}
          />
        ))}
      </div>

      {!reduceMotion ? (
        <div className="mt-5 flex justify-center gap-1 md:hidden" role="group" aria-label="Success stories">
          {STORIES.map((story, storyIndex) => (
            <button
              key={story.name}
              type="button"
              aria-label={`Show story from ${story.name}`}
              aria-current={index === storyIndex ? "true" : undefined}
              onClick={() => setIndex(storyIndex)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <span
                className={`block h-2.5 w-2.5 rounded-full ${
                  index === storyIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
