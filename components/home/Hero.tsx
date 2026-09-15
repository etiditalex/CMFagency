"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { cloudinaryLoader } from "@/lib/cloudinary";

const HERO_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg";

const TITLE_PREFIX = "Strategic Marketing That Powers";
const TITLE_PHRASES = [
  ["Growth", "and", "Relevance"],
  ["Events", "and", "Campaigns"],
  ["Digital", "Marketing", "Tools"],
] as const;

const CANONICAL_TITLE = `${TITLE_PREFIX} ${TITLE_PHRASES[0].join(" ")}`;

const HERO_DESCRIPTION =
  "We plan and manage events from first brief to last guest, then keep that work moving with digital marketing tools that promote, measure, and grow every campaign. Ticketing runs on Fusion Xpress—our platform for selling tickets, managing attendees, and running voting programmes for shows, launches, awards, and fan experiences—so the live moment and the digital follow-through stay in one place, and brands remain visible long after the room empties.";

const LONGEST_PHRASE = TITLE_PHRASES.reduce((longest, phrase) => {
  const next = phrase.join(" ");
  return next.length > longest.length ? next : longest;
}, "");

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(motionQuery.matches);
    sync();
    motionQuery.addEventListener("change", sync);
    return () => motionQuery.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function usePhraseWordTypewriter(
  phrases: readonly (readonly string[])[],
  reduceMotion: boolean
) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [wordCount, setWordCount] = useState(phrases[0].length);
  const [phase, setPhase] = useState<"holding" | "deleting" | "typing">("holding");

  useEffect(() => {
    if (reduceMotion) {
      setPhraseIndex(0);
      setWordCount(phrases[0].length);
      setPhase("holding");
      return undefined;
    }

    const words = phrases[phraseIndex];

    if (phase === "holding") {
      const timer = window.setTimeout(() => setPhase("deleting"), 2400);
      return () => window.clearTimeout(timer);
    }

    if (phase === "deleting") {
      if (wordCount > 0) {
        const timer = window.setTimeout(() => setWordCount((count) => count - 1), 220);
        return () => window.clearTimeout(timer);
      }
      const timer = window.setTimeout(() => {
        setPhraseIndex((index) => (index + 1) % phrases.length);
        setPhase("typing");
      }, 280);
      return () => window.clearTimeout(timer);
    }

    if (wordCount < words.length) {
      const timer = window.setTimeout(() => setWordCount((count) => count + 1), 320);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setPhase("holding"), 80);
    return () => window.clearTimeout(timer);
  }, [phase, phraseIndex, phrases, reduceMotion, wordCount]);

  return phrases[phraseIndex].slice(0, wordCount).join(" ");
}

export default function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const animatedWords = usePhraseWordTypewriter(TITLE_PHRASES, reduceMotion);

  return (
    <section
      className="home-hero relative w-full overflow-x-visible bg-primary-950 pt-[calc(env(safe-area-inset-top,0px)+9.5rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+9.25rem)] md:pt-[calc(env(safe-area-inset-top,0px)+9.75rem)]"
      aria-labelledby="home-hero-heading"
    >
      <div className="relative isolate min-h-[22rem] overflow-visible sm:min-h-[28rem] md:min-h-[32rem] lg:min-h-[36rem] xl:min-h-[38rem]">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <Image
            loader={cloudinaryLoader}
            src={HERO_IMAGE}
            alt=""
            fill
            className="object-cover object-[70%_center] sm:object-[74%_center] lg:object-[80%_center]"
            priority
            fetchPriority="high"
            quality={75}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-950 from-0% via-primary-950/96 via-[62%] to-primary-950/35 to-[100%] sm:via-primary-950/95 sm:via-[32%] sm:to-transparent sm:to-[78%] lg:from-[4%] lg:via-primary-950/92 lg:via-[34%] lg:to-[72%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-950/85 via-primary-950/25 to-primary-950/45 sm:from-primary-950/70 sm:via-primary-950/20 sm:to-primary-950/30 lg:from-primary-950/25 lg:via-transparent lg:to-primary-950/20" />
        </div>

        <div className="relative z-10 flex min-h-[inherit] w-full items-start overflow-visible px-4 pb-6 pt-4 sm:px-8 sm:pb-12 sm:pt-5 md:px-12 md:pb-14 md:pt-5 lg:px-16 lg:pb-16 lg:pt-6 xl:px-20">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl overflow-visible md:max-w-4xl lg:max-w-5xl xl:max-w-6xl"
          >
            <h1
              id="home-hero-heading"
              aria-label={CANONICAL_TITLE}
              className="!text-left overflow-visible font-montserrat text-[clamp(1.35rem,6.4vw,1.75rem)] font-bold leading-[1.28] tracking-normal text-white sm:text-5xl sm:leading-tight md:text-6xl lg:text-7xl xl:text-[4.75rem]"
            >
              <span aria-hidden="true" className="flex flex-col items-start gap-1.5 overflow-visible sm:gap-2">
                <span className="block overflow-visible py-[0.08em]">Strategic Marketing</span>
                <span className="block overflow-visible py-[0.08em]">That Powers</span>
                <span className="relative block min-h-[1.45em] w-full overflow-visible py-[0.08em] sm:min-h-[2.6em] md:min-h-[1.35em]">
                  <span className="invisible !text-left md:whitespace-nowrap" aria-hidden>
                    {LONGEST_PHRASE}
                  </span>
                  <span className="absolute left-0 top-0 w-full overflow-visible break-words !text-left md:whitespace-nowrap">
                    {animatedWords}
                    {reduceMotion ? null : (
                      <span
                        className="home-hero-caret ml-1 inline-block h-[0.78em] w-[3px] translate-y-[0.12em] bg-secondary-400 align-baseline"
                        aria-hidden
                      />
                    )}
                  </span>
                </span>
              </span>
            </h1>
            <p className="!text-left mt-4 w-full max-w-none text-sm leading-relaxed text-white/90 sm:mt-6 sm:max-w-2xl sm:text-base sm:leading-7 md:max-w-3xl md:text-[1.05rem] md:leading-[1.7] lg:max-w-[min(42rem,calc(50vw-5rem))] lg:text-[1.08rem]">
              {HERO_DESCRIPTION}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
