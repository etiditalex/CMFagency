"use client";

import { useEffect, useRef, useState } from "react";
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

function bubbleMotion(delta: number) {
  if (delta < 0) {
    const past = Math.min(-delta, 1);
    return {
      opacity: Math.max(0, 1 - past * 1.35),
      transform: `translate(${-past * 8}%, ${-past * 42}vh) scale(${1 - past * 0.2})`,
      zIndex: 24,
      featured: past < 0.45,
    };
  }

  const step = Math.min(delta, 1.35);
  const fade = delta <= 1 ? 1 : Math.max(0, 1 - (delta - 1) * 1.2);
  return {
    opacity: fade,
    transform: `translate(${Math.min(step, 1) * 58}%, ${Math.min(step, 1) * 34}vh) scale(${1 - Math.min(step, 1) * 0.64})`,
    zIndex: Math.round(30 - delta * 8),
    featured: delta < 0.42,
  };
}

function QuoteBubble({
  story,
  delta,
  stacked = false,
}: {
  story: HomeStory;
  delta: number;
  stacked?: boolean;
}) {
  const motion = bubbleMotion(delta);
  if (!stacked && motion.opacity <= 0.02) return null;

  return (
    <figure
      className={`${
        stacked ? "relative" : "absolute left-0 top-0 origin-top-left"
      } w-[min(100%,58rem)] rounded-[2rem] px-6 py-6 sm:rounded-[2.6rem] sm:px-8 sm:py-8 ${
        motion.featured || stacked ? "bg-secondary-600 text-white" : "bg-[#e5f3f7] text-primary-950"
      }`}
      style={
        stacked
          ? undefined
          : {
              opacity: motion.opacity,
              transform: motion.transform,
              zIndex: motion.zIndex,
            }
      }
    >
      <blockquote className="text-[1.05rem] font-medium leading-snug sm:text-2xl sm:leading-snug">
        {story.quote}
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-950/10 text-sm font-semibold">
          {testimonialInitials(story.name)}
        </span>
        <span>
          <span className="block font-montserrat text-base font-semibold">{story.name}</span>
          <span className={`block text-sm ${motion.featured ? "text-white/80" : "text-primary-800/70"}`}>
            {story.role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export default function HomeSuccessStoriesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
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
        if (rows.length > 0) setStories(rows);
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
    if (reduceMotion || stories.length < 2) return undefined;
    let frame = 0;
    const measure = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const distance = section.offsetHeight - window.innerHeight;
      const travelled = Math.min(Math.max(-rect.top, 0), Math.max(distance, 1));
      setProgress(distance > 0 ? travelled / distance : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduceMotion, stories.length]);

  if (stories.length === 0) return null;

  const focus = progress * Math.max(stories.length - 1, 0);

  return (
    <section
      ref={sectionRef}
      className="home-success home-arch relative bg-primary-950"
      style={reduceMotion || stories.length < 2 ? undefined : { height: `${stories.length * 100}vh` }}
      aria-labelledby="home-success-heading"
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden px-5 pt-[calc(var(--site-nav-height)+1.25rem)] sm:px-10 lg:px-16">
        <h2 id="home-success-heading" className="home-client-title home-display max-w-4xl text-white">
          From our clients
        </h2>
        <p className="sr-only">
          {stories.map((story) => `${story.name}, ${story.role}. ${story.quote}`).join(" ")}
        </p>

        {reduceMotion ? (
          <div className="mt-8 space-y-4 overflow-y-auto pb-10">
            {stories.map((story) => (
              <QuoteBubble key={story.id} story={story} delta={0} stacked />
            ))}
          </div>
        ) : (
          <div className="relative mt-6 min-h-0 flex-1">
            {stories.map((story, index) => (
              <QuoteBubble key={story.id} story={story} delta={index - focus} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
