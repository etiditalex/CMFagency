"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const MISSION =
  "To harness marketing as the catalyst for change and innovation, empowering businesses to thrive and define their existence in the marketplace.";

const VISION =
  "To be the driving force behind businesses' success in a dynamic and ever-evolving market landscape.";

const ROWS = [
  { label: "Event planning", href: "/services/events-marketing" },
  { label: "Digital marketing", href: "/services/digital-marketing" },
  { label: "SEO", href: "/services/seo" },
  { label: "Social media marketing", href: "/services/social-media-marketing" },
  { label: "Website development", href: "/services/website-development" },
  { label: "Branding and creative", href: "/services/branding" },
  { label: "Market research", href: "/services/market-research" },
  { label: "Content creation", href: "/services/content-creation" },
  { label: "Poll", href: "/poll" },
  { label: "Fusion Xpress", href: "/fusion-xpress" },
  { label: "Career pathways", href: "/careers" },
] as const;

export default function AboutUsSection() {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return undefined;

    let frame = 0;
    const measure = () => {
      const rows = listRef.current?.querySelectorAll<HTMLElement>(".home-service-row");
      if (!rows?.length) return;
      const center = window.innerHeight / 2;
      const band = window.innerHeight * 0.32;
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        const focus = Math.max(0, 1 - distance / band);
        const eased = focus * focus * (3 - 2 * focus);
        row.style.setProperty("--f", eased.toFixed(3));
      });
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
  }, []);

  return (
    <section id="home-about" className="home-about home-band home-band-paper home-arch" aria-labelledby="home-about-heading">
      <div className="home-shell grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--site-nav-height)+1.75rem)] lg:self-start lg:pb-16">
          <h2 id="home-about-heading" className="home-display text-primary-950">
            What we deliver
          </h2>
          <p className="home-lead mt-6 max-w-xl text-primary-900/80">{MISSION}</p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-900/75">{VISION}</p>
          <p className="mt-6 font-montserrat text-lg font-medium text-secondary-700">
            Market to thrive. Market to exist.
          </p>
          <Link href="#home-brief" className="home-text-link mt-8 text-primary-800">
            Start a brief <span aria-hidden>→</span>
          </Link>
        </div>
        <ul ref={listRef}>
          {ROWS.map((row) => (
            <li key={row.href}>
              <Link href={row.href} className="home-service-row text-primary-950">
                <span className="home-service-name">
                  {row.label}
                </span>
                <span className="home-service-arrow" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
