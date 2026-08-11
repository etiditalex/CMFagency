"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { montserrat } from "@/lib/fonts";

type QuickLinkItem = {
  id: string;
  title: string;
  href: string;
  body: React.ReactNode;
};

const quickLinks: QuickLinkItem[] = [
  {
    id: "events",
    title: "Events calendar",
    href: "/events/calendar",
    body: (
      <>
        <p className="mb-2.5 text-[0.95rem] leading-relaxed text-gray-700">
          Opens our <strong>full calendar view</strong>—month, week, or day—so you can see what sits on which date before you
          dive into a single listing. Past and upcoming items from our programme both appear when they have a date.
        </p>
        <p className="text-[0.95rem] leading-relaxed text-gray-700">
          Click an event block to go straight to that event&apos;s page for <strong>details and tickets</strong> where
          they&apos;re available.
        </p>
      </>
    ),
  },
  {
    id: "portfolios",
    title: "Portfolios",
    href: "/portfolios",
    body: (
      <>
        <p className="mb-2.5 text-[0.95rem] leading-relaxed text-gray-700">
          This is the <strong>visual proof</strong>: campaigns, stages, branding moments, and creative work we&apos;ve been
          part of. Handy if you&apos;re comparing agencies, chasing a <strong>look and feel</strong>, or just want to see
          what “Changer Fusions on site” looks like in photos, not slides.
        </p>
        <p className="text-[0.95rem] leading-relaxed text-gray-700">
          Skim by project type, then dig into the pieces that match what you&apos;re trying to build next.
        </p>
      </>
    ),
  },
  {
    id: "jobs",
    title: "Job board",
    href: "/jobs",
    body: (
      <>
        <p className="mb-2.5 text-[0.95rem] leading-relaxed text-gray-700">
          Roles we&apos;re helping surface—<strong>open positions</strong>, how to apply, and plain-language summaries so you
          don&apos;t have to decode a PDF at midnight. If you&apos;re hiring through our network, it&apos;s also the place
          listings land when we&apos;re amplifying them.
        </p>
        <p className="text-[0.95rem] leading-relaxed text-gray-700">
          Check back when you&apos;re ready to move; we refresh as partners and programmes change.
        </p>
      </>
    ),
  },
  {
    id: "talent",
    title: "Talent showcase",
    href: "/talent",
    body: (
      <>
        <p className="mb-2.5 text-[0.95rem] leading-relaxed text-gray-700">
          People we&apos;ve worked with in front of the room and on the runway—<strong>models, hosts, and creatives</strong>{" "}
          we&apos;re comfortable putting forward by name. Casting teams and brands use it to get a first pass on faces and
          bios before a call, not to replace a proper brief.
        </p>
        <p className="text-[0.95rem] leading-relaxed text-gray-700">
          If you&apos;re talent, it&apos;s a window into how we present the community we build with—not a guarantee of every
          gig, but a serious shop window.
        </p>
      </>
    ),
  },
  {
    id: "careers",
    title: "Career development",
    href: "/careers",
    body: (
      <>
        <p className="mb-2.5 text-[0.95rem] leading-relaxed text-gray-700">
          The wider lane: <strong>internships</strong>, attachment tracks, and the longer arc beyond a single vacancy. Use it
          when you&apos;re asking “what else exists here?” rather than “is there one job open today?”—it points you to
          structured paths and back to the <strong>job board</strong> when something concrete is live.
        </p>
        <p className="text-[0.95rem] leading-relaxed text-gray-700">
          Students and career switchers usually start here; hiring managers can see how we funnel people into real roles.
        </p>
      </>
    ),
  },
];

export default function QuickLinks() {
  const [activeId, setActiveId] = useState(quickLinks[0].id);
  const active = quickLinks.find((l) => l.id === activeId) ?? quickLinks[0];

  return (
    <section
      className="bg-gray-50 py-6 sm:py-8 md:py-10 lg:py-12"
      aria-labelledby="quick-links-heading"
    >
      <div className="container-custom">
        <h2 id="quick-links-heading" className="sr-only">
          Quick links
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch lg:gap-5">
          {/* Sidebar — tab list */}
          <nav
            className="lg:col-span-4 xl:col-span-3"
            aria-label="Quick links sections"
          >
            <ul className="flex flex-col gap-1" role="tablist">
              {quickLinks.map((link) => {
                const isActive = link.id === activeId;
                return (
                  <li key={link.id} role="none">
                    <button
                      type="button"
                      role="tab"
                      id={`tab-${link.id}`}
                      aria-selected={isActive}
                      aria-controls={`panel-${link.id}`}
                      tabIndex={0}
                      onClick={() => setActiveId(link.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2 text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                        isActive
                          ? "border-secondary-600 bg-secondary-600 text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-900 hover:border-secondary-300 hover:bg-gray-50/80"
                      }`}
                    >
                      <span>{link.title}</span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-gray-500"}`}
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content pane */}
          <div className="lg:col-span-8 xl:col-span-9 lg:flex lg:flex-col">
            <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  id={`panel-${active.id}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${active.id}`}
                  className="flex flex-1 flex-col"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3
                    className={`${montserrat.className} mb-2 text-lg font-semibold text-gray-900 sm:text-xl`}
                  >
                    {active.title}
                  </h3>
                  <div className="flex-1 text-left">{active.body}</div>
                  <div className="mt-auto border-t border-gray-100 pt-3">
                    <Link
                      href={active.href}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700"
                    >
                      Go to {active.title}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
