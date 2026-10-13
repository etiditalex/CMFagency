"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";

type BuildIcon = "events" | "models" | "careers" | "tickets" | "web";

type BuildItem = {
  title: string;
  word: string;
  description: string;
  href: string;
  frame: string;
  wash: string;
  icon: BuildIcon;
};

const items: BuildItem[] = [
  {
    title: "Event Planning",
    word: "Events",
    description:
      "From concept to curtain call, we plan and produce events people remember.",
    href: "/services/events-marketing",
    frame: "#1e58ca",
    wash: "#c5daf8",
    icon: "events",
  },
  {
    title: "Modelling",
    word: "Models",
    description:
      "Models, MCs, and creatives for campaigns and runways across Kenya.",
    href: "/talent",
    frame: "#1d8a63",
    wash: "#c6f0da",
    icon: "models",
  },
  {
    title: "Job Placement & Applications",
    word: "Careers",
    description:
      "Open roles, applications, and placements that connect talent with employers.",
    href: "/jobs",
    frame: "#151321",
    wash: "#e4e5ee",
    icon: "careers",
  },
  {
    title: "Ticketing & Voting",
    word: "Xpress",
    description:
      "Ticket sales and live voting, from checkout to the gate and the final count.",
    href: "/fusion-xpress",
    frame: "#0f766e",
    wash: "#c8f0ec",
    icon: "tickets",
  },
  {
    title: "Web Development",
    word: "Web",
    description:
      "Responsive websites and web apps, designed to look sharp and load fast.",
    href: "/services/website-development",
    frame: "#0D3A99",
    wash: "#d0def6",
    icon: "web",
  },
];

function Mark({ icon }: { icon: BuildIcon }) {
  const common = {
    viewBox: "0 0 32 32",
    className: "h-8 w-8 shrink-0 sm:h-9 sm:w-9",
    fill: "none",
    "aria-hidden": true as const,
  };

  if (icon === "events") {
    return (
      <svg {...common}>
        <rect x="5" y="7" width="22" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
        <path d="M5 13h22M11 5v4M21 5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 18h4M17 18h4M11 22h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "models") {
    return (
      <svg {...common}>
        <circle cx="16" cy="11" r="4.2" stroke="currentColor" strokeWidth="2" />
        <path
          d="M7.5 26c1.4-4.4 4.4-6.6 8.5-6.6s7.1 2.2 8.5 6.6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (icon === "careers") {
    return (
      <svg {...common}>
        <rect x="4" y="12" width="24" height="14" rx="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 12V9.2A4 4 0 0 1 20 9.2V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 18h24" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }

  if (icon === "tickets") {
    return (
      <svg {...common}>
        <path
          d="M6 9h20v4.2a2.8 2.8 0 0 0 0 5.6V23H6v-4.2a2.8 2.8 0 0 0 0-5.6V9Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M16 9v14" stroke="currentColor" strokeWidth="2" strokeDasharray="2.2 2.4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="4" y="6" width="24" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M4 11.5h24" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12.5 21.5 16 15l3.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneCard({
  item,
  copy,
  index,
}: {
  item: BuildItem;
  copy: number;
  index: number;
}) {
  const hidden = copy === 1;

  return (
    <div
      className="home-build-slot flex shrink-0 snap-center justify-center"
      data-build-card
      data-copy={copy}
      data-index={index}
      aria-hidden={hidden || undefined}
    >
      <article
        className="w-full max-w-[15.75rem] overflow-hidden rounded-[2rem] p-1.5 sm:rounded-[2.4rem] sm:p-2"
        style={{ backgroundColor: item.frame }}
      >
        <div className="relative flex flex-col overflow-hidden rounded-[1.6rem] bg-white sm:rounded-[1.85rem]">
          <div
            className="absolute left-1/2 top-0 z-20 h-[22px] w-[88px] -translate-x-1/2 rounded-b-[12px] bg-[#111114] sm:h-[26px] sm:w-[108px] sm:rounded-b-[14px]"
            aria-hidden
          />
          <div
            className="relative flex h-[132px] items-center justify-center px-3 pt-6 sm:h-[176px] sm:pt-7"
            style={{
              background: `linear-gradient(180deg, ${item.wash} 0%, #ffffff 84%)`,
            }}
          >
            <div className="flex max-w-full items-center gap-2" style={{ color: item.frame }}>
              <Mark icon={item.icon} />
              <span className="home-build-word">{item.word}</span>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col items-center px-4 pb-5 pt-3 text-center sm:px-5 sm:pb-6">
            <h3 className="flex min-h-[2.6rem] max-w-[12.5rem] items-center justify-center">
              {item.title}
            </h3>
            <p className="mt-1.5 min-h-[4.35rem] w-full min-w-0 sm:min-h-[3.75rem]">{item.description}</p>
            <Link
              href={item.href}
              tabIndex={hidden ? -1 : 0}
              aria-label={`Learn more about ${item.title}`}
              className="home-build-cta mt-4 inline-flex min-h-11 min-w-[8.25rem] items-center justify-center rounded-full px-5 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              style={{ backgroundColor: item.frame }}
            >
              Learn More
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}

function perViewFor(width: number) {
  if (width >= 700) return 3;
  if (width >= 480) return 2;
  return 1;
}

export default function WhatWeDoOrbit() {
  const reduceMotion = useReducedMotion();
  const motionOff = reduceMotion === true;
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [sliding, setSliding] = useState(true);
  const [slot, setSlot] = useState(272);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const width = viewport.clientWidth;
      if (width < 1) return;
      const next = width / perViewFor(width);
      setSlot((current) => (Math.abs(current - next) < 0.5 ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const goNext = () => {
    if (indexRef.current >= items.length) {
      setSliding(false);
      setIndex(0);
      return;
    }
    setSliding(true);
    setIndex(indexRef.current + 1);
  };

  const goPrev = () => {
    const current = indexRef.current % items.length;
    if (current === 0) {
      setSliding(false);
      setIndex(items.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSliding(true);
          setIndex(items.length - 1);
        });
      });
      return;
    }
    setSliding(true);
    setIndex(current - 1);
  };

  useEffect(() => {
    if (motionOff) return;
    const viewport = viewportRef.current;
    let onScreen = true;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    if (viewport) observer.observe(viewport);

    const timer = window.setInterval(() => {
      if (pausedRef.current || !onScreen || document.visibilityState !== "visible") return;
      goNext();
    }, 4200);

    return () => {
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [motionOff]);

  useEffect(() => {
    if (sliding) return;
    const frame = requestAnimationFrame(() => setSliding(true));
    return () => cancelAnimationFrame(frame);
  }, [sliding]);

  const active = index % items.length;
  const copies = motionOff ? [0] : [0, 1];

  return (
    <section
      className="home-build relative isolate overflow-hidden bg-primary-500 py-12 sm:py-16 lg:py-20"
      aria-labelledby="home-build-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <h2 id="home-build-heading" className="text-center text-white">
          What we&apos;re building
        </h2>

        <div
          ref={viewportRef}
          className={`relative mx-auto mt-7 w-full max-w-[19.5rem] sm:mt-12 sm:max-w-[34rem] lg:max-w-[51rem] ${
            motionOff ? "snap-x snap-mandatory overflow-x-auto" : "touch-pan-y overflow-hidden"
          }`}
          style={{ "--build-slot": `${slot}px` } as React.CSSProperties}
          aria-roledescription="carousel"
          aria-label="What we're building"
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
          onFocus={() => {
            pausedRef.current = true;
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              pausedRef.current = false;
            }
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse") return;
            pausedRef.current = true;
            swipeRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = swipeRef.current;
            swipeRef.current = null;
            pausedRef.current = false;
            if (!start || motionOff) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
            suppressClickRef.current = true;
            if (dx < 0) goNext();
            else goPrev();
          }}
          onPointerCancel={() => {
            swipeRef.current = null;
            pausedRef.current = false;
          }}
          onClickCapture={(event) => {
            if (!suppressClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }}
        >
          <div
            ref={trackRef}
            className="flex w-max"
            style={{
              transform: motionOff ? undefined : `translate3d(${-index * slot}px, 0, 0)`,
              transition:
                !motionOff && sliding
                  ? "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : "none",
            }}
            onTransitionEnd={(event) => {
              if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
              if (indexRef.current < items.length) return;
              setSliding(false);
              setIndex(0);
            }}
          >
            {copies.map((copy) =>
              items.map((item, cardIndex) => (
                <PhoneCard
                  key={`${item.title}-${copy}`}
                  item={item}
                  copy={copy}
                  index={cardIndex}
                />
              )),
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center sm:mt-8">
          {items.map((item, dotIndex) => {
            const selected = active === dotIndex;
            return (
              <button
                key={item.title}
                type="button"
                aria-label={`Show ${item.title}`}
                aria-current={selected ? "true" : undefined}
                onClick={() => {
                  if (motionOff) {
                    document
                      .querySelector<HTMLElement>(`[data-copy="0"][data-index="${dotIndex}"]`)
                      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
                    setIndex(dotIndex);
                    return;
                  }
                  setSliding(true);
                  setIndex(dotIndex);
                }}
                className="inline-flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    selected ? "bg-[#0a1f42]" : "bg-white/75"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
