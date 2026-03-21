"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  CalendarRange,
  UserSquare2,
  Briefcase,
  Share2,
  Ticket,
  Code2,
  type LucideIcon,
} from "lucide-react";

type Service = {
  label: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

const services: Service[] = [
  {
    label: "Events Planning",
    href: "/services/events-marketing",
    icon: CalendarRange,
    accent: "from-cyan-400 to-primary-500",
  },
  {
    label: "Modelling",
    href: "/talent",
    icon: UserSquare2,
    accent: "from-fuchsia-400 to-primary-600",
  },
  {
    label: "Job Placement & Applications",
    href: "/jobs",
    icon: Briefcase,
    accent: "from-amber-400 to-secondary-500",
  },
  {
    label: "Social Media Management",
    href: "/services/digital-marketing",
    icon: Share2,
    accent: "from-sky-400 to-primary-500",
  },
  {
    label: "Ticketing & Voting",
    href: "/events/upcoming",
    icon: Ticket,
    accent: "from-emerald-400 to-secondary-600",
  },
  {
    label: "Web Development",
    href: "/services/website-development",
    icon: Code2,
    accent: "from-violet-400 to-primary-700",
  },
];

/** Isometric “people building together” hub — SVG, no external asset. */
function HumanBuildingHub({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      className="relative z-10 flex h-36 w-36 items-center justify-center sm:h-44 sm:w-44"
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/25 via-white/5 to-secondary-400/20 blur-xl"
        animate={
          reduceMotion
            ? undefined
            : { opacity: [0.5, 0.85, 0.5], scale: [1, 1.06, 1] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <svg
        viewBox="0 0 200 200"
        className="relative z-[1] h-full w-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        aria-hidden
      >
        <defs>
          <linearGradient id="wb-face" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="wb-block" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>
        {/* Isometric base platform */}
        <path
          fill="url(#wb-block)"
          opacity={0.35}
          d="M100 168 L40 138 L100 108 L160 138 Z"
        />
        <path
          fill="#64748b"
          opacity={0.5}
          d="M100 108 L40 138 L40 128 L100 98 L160 128 L160 138 Z"
        />
        {/* Stacked blocks — “building” */}
        <path fill="#cbd5e1" d="M88 112 L112 112 L118 96 L82 96 Z" />
        <path fill="#94a3b8" d="M82 96 L118 96 L118 88 L82 88 Z" />
        <path fill="#e2e8f0" d="M76 92 L124 92 L130 76 L70 76 Z" />
        <path fill="#cbd5e1" d="M70 76 L130 76 L130 68 L70 68 Z" />
        {/* Small figures (abstract humans) */}
        <circle cx={72} cy={124} r={7} fill="url(#wb-face)" />
        <path
          d="M72 131 L66 148 L78 148 Z"
          fill="#38bdf8"
          opacity={0.85}
        />
        <circle cx={128} cy={120} r={7} fill="url(#wb-face)" />
        <path
          d="M128 127 L122 146 L134 146 Z"
          fill="#34d399"
          opacity={0.85}
        />
        <circle cx={100} cy={100} r={8} fill="url(#wb-face)" />
        <path
          d="M100 108 L92 132 L108 132 Z"
          fill="#818cf8"
          opacity={0.9}
        />
        {/* Top capstone */}
        <path fill="#f8fafc" d="M92 64 L108 64 L112 54 L88 54 Z" />
        <path fill="#cbd5e1" d="M88 54 L112 54 L112 50 L88 50 Z" />
      </svg>
    </motion.div>
  );
}

export default function WhatWeDoOrbit() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate z-0 overflow-hidden bg-primary-600 py-16 text-white md:py-20">
      <div className="container-custom relative z-10">
        <motion.div
          className="mx-auto mb-10 max-w-3xl text-center md:mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
            What we&apos;re building
          </p>
          <h2 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            People, platforms &amp; experiences — together
          </h2>
        </motion.div>

        {/* Flat 2D orbit (no rotateX / perspective) so nothing paints into the stats section below */}
        <div className="mx-auto max-w-lg px-2 sm:max-w-xl md:max-w-2xl">
          <motion.div
            className="relative mx-auto aspect-square w-full max-w-[min(92vw,440px)] sm:max-w-[480px]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="absolute inset-[5%]"
              animate={reduceMotion ? undefined : { rotate: [0, 360] }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 100, repeat: Infinity, ease: "linear" }
              }
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-white/35"
                aria-hidden
              />
              {services.map((service, index) => {
                const total = services.length;
                const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
                const r = 42;
                const x = 50 + r * Math.cos(angle);
                const y = 50 + r * Math.sin(angle);
                const depth = (Math.cos(angle) + 1) / 2;
                const scale = 0.92 + depth * 0.1;
                const z = Math.round(10 + depth * 20);

                return (
                  <motion.div
                    key={service.label}
                    className="absolute w-[38%] max-w-[10.5rem] sm:max-w-[11rem]"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      zIndex: z,
                      transform: `translate(-50%, -50%) scale(${scale})`,
                    }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.06 * index }}
                  >
                    <motion.div
                      animate={reduceMotion ? undefined : { rotate: [0, -360] }}
                      transition={
                        reduceMotion
                          ? undefined
                          : { duration: 100, repeat: Infinity, ease: "linear" }
                      }
                    >
                      <Link
                        href={service.href}
                        title={service.label}
                        className="group flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white px-1.5 py-2 text-center shadow-md transition-all hover:border-primary-200 hover:shadow-lg sm:min-h-0 sm:gap-1.5 sm:px-2.5 sm:py-2.5"
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${service.accent} shadow-md sm:h-10 sm:w-10`}
                        >
                          <service.icon
                            className="h-[1.15rem] w-[1.15rem] text-white sm:h-5 sm:w-5"
                            strokeWidth={2}
                          />
                        </div>
                        <span className="line-clamp-3 text-[0.58rem] font-semibold leading-tight text-gray-900 group-hover:text-primary-600 sm:line-clamp-none sm:text-[0.68rem]">
                          {service.label}
                        </span>
                      </Link>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>

            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <HumanBuildingHub reduceMotion={reduceMotion} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
