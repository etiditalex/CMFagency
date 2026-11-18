"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cloudinaryLoaderHero } from "@/lib/cloudinary";

const TITLE_PREFIX = "Strategic marketing that powers";
const TITLE_PHRASES = [
  "growth and relevance",
  "events and campaigns",
  "digital marketing",
] as const;

const CANONICAL_TITLE = `${TITLE_PREFIX} ${TITLE_PHRASES[0]}`;

/** Landscape homepage photos. Homepage 4 leads because it is the sharpest frame. */
const SLIDES = [
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396193/Homepage_4_qik5ts.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_3_puyiot.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396193/Homepage_2_pfpccl.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_5_ut7g6w.jpg",
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_1_n4ow6e.jpg",
] as const;

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

export default function Hero() {
  const reduceMotion = usePrefersReducedMotion();
  const [slide, setSlide] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % SLIDES.length);
    }, 6800);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % TITLE_PHRASES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const phrase = TITLE_PHRASES[phraseIndex];

  return (
    <section
      className="home-hero relative w-full overflow-hidden bg-primary-950"
      aria-labelledby="home-hero-heading"
    >
      <div className="home-hero-stage" aria-hidden>
        {SLIDES.map((src, index) => (
          <Image
            key={src}
            loader={cloudinaryLoaderHero}
            src={src}
            alt=""
            fill
            priority={index === 0}
            fetchPriority={index === 0 ? "high" : "low"}
            quality={90}
            sizes="100vw"
            className={`home-hero-slide${index === slide ? " is-on" : ""}`}
          />
        ))}
      </div>
      <div className="home-hero-shade" aria-hidden />

      <h1 id="home-hero-heading" aria-label={CANONICAL_TITLE} className="home-hero-title">
        <span className="home-hero-lead">{TITLE_PREFIX}</span>
        <span className="home-hero-win">
          <span key={phrase} className="home-hero-phrase">
            {phrase}
          </span>
        </span>
      </h1>

      <div className="home-hero-meta">
        <p className="home-hero-caption">
          <b>Coast Fashion and Modelling Awards 2026</b>
          City Blue Creekside Hotel, Mombasa · 15 August 2026
        </p>
        <div className="home-hero-seq" aria-hidden>
          {SLIDES.map((src, index) => (
            <i
              key={src}
              className={index < slide ? "is-done" : index === slide ? "is-now" : undefined}
            />
          ))}
        </div>
      </div>

      <div className="home-hero-cta">
        <Link href="#home-brief" className="home-hero-btn">
          Start a brief
        </Link>
        <a href="#home-story" className="home-hero-scroll" aria-label="Scroll to continue">
          <span aria-hidden>↓</span>
        </a>
      </div>
    </section>
  );
}
