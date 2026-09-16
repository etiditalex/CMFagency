"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  FALLBACK_HOME_STORIES,
  isMissingTestimonialsTable,
  TESTIMONIAL_PUBLIC_SELECT,
  testimonialInitials,
} from "@/lib/testimonials";

type HomeStory = {
  id: number;
  name: string;
  role: string;
  quote: string;
  image_url: string;
};

const HOLD_MS = 7000;
const FADE_CLASS = "duration-[1800ms]";
const VISIBLE = 3;

function StoryPortrait({ name, imageUrl }: { name: string; imageUrl: string }) {
  if (!imageUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white/15 font-montserrat text-sm font-bold text-white sm:text-base">
        {testimonialInitials(name)}
      </div>
    );
  }
  return (
    <Image
      src={imageUrl}
      alt=""
      width={160}
      height={160}
      className="h-full w-full object-cover object-center"
      unoptimized
    />
  );
}

function StorySlot({
  story,
  stories,
  className = "",
}: {
  story: HomeStory;
  stories: HomeStory[];
  className?: string;
}) {
  return (
    <article
      className={`relative min-h-[28rem] overflow-y-auto rounded-xl bg-secondary-800 sm:min-h-[28rem] sm:overflow-hidden lg:min-h-[32rem] ${className}`}
    >
      {stories.map((person) => (
        <div
          key={person.id}
          className={`absolute inset-0 flex flex-col overflow-hidden px-4 py-6 transition-opacity ${FADE_CLASS} ease-in-out sm:px-6 sm:py-8 lg:px-7 lg:py-9 ${
            person.id === story.id ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={person.id !== story.id}
        >
          <div className="mb-3 flex items-center gap-3 sm:mb-6 sm:gap-4">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30 sm:h-16 sm:w-16">
              <StoryPortrait name={person.name} imageUrl={person.image_url} />
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
  const [stories, setStories] = useState<HomeStory[]>(FALLBACK_HOME_STORIES);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("testimonials")
          .select(TESTIMONIAL_PUBLIC_SELECT)
          .eq("is_active", true)
          .eq("show_on_home", true)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        const rows = (data ?? []) as HomeStory[];
        setStories(rows);
        setIndex(0);
      } catch (error) {
        if (!cancelled && !isMissingTestimonialsTable(error as { message?: string; code?: string })) {
          setStories(FALLBACK_HOME_STORIES);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(motionQuery.matches);
    sync();
    motionQuery.addEventListener("change", sync);
    return () => motionQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion || stories.length <= 1) return undefined;

    const section = sectionRef.current;
    if (!section) return undefined;

    let timer: number | undefined;
    const start = () => {
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % stories.length);
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
  }, [reduceMotion, stories.length]);

  if (stories.length === 0) return null;

  const visibleCount = Math.min(VISIBLE, stories.length);
  const visible = Array.from({ length: visibleCount }, (_, slot) => stories[(index + slot) % stories.length]);

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
        {stories.map((story) => `${story.name}, ${story.role}. ${story.quote}`).join(" ")}
      </p>

      <div
        className="mx-auto grid w-full grid-cols-1 gap-4 px-4 sm:px-6 md:grid-cols-3 md:gap-5 md:px-8 lg:px-10"
        aria-hidden="true"
      >
        {(reduceMotion ? stories.slice(0, visibleCount) : visible).map((story, slot) => (
          <StorySlot
            key={reduceMotion ? story.id : `slot-${slot}`}
            story={story}
            stories={stories}
            className={slot > 0 ? "hidden md:block" : undefined}
          />
        ))}
      </div>

      {!reduceMotion && stories.length > 1 ? (
        <div className="mt-5 flex justify-center gap-1 md:hidden" role="group" aria-label="Success stories">
          {stories.map((story, storyIndex) => (
            <button
              key={story.id}
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
