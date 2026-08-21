"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Info,
} from "lucide-react";

import {
  VISITOR_MANAGEMENT_DOC_FLOWS,
  VISITOR_MANAGEMENT_DOC_SECTIONS,
  type DocSection,
} from "@/lib/visitors/doc-content";

function DocSectionCard({ section }: { section: DocSection }) {
  return (
    <section id={section.id} className="scroll-mt-24">
      <div className="border border-[#e5e5e5] bg-white overflow-hidden">
        <div className="border-b border-[#e5e5e5] bg-white px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-[#1a2332]">{section.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{section.summary}</p>
        </div>

        <div className="px-5 py-5 sm:px-6 space-y-5">
          {section.bullets?.length ? (
            <ul className="space-y-2">
              {section.bullets.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {section.steps?.length ? (
            <ol className="space-y-3">
              {section.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-3 border border-[#e5e5e5] bg-white px-4 py-3"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                    <p className="mt-0.5 text-sm text-gray-600 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          {section.note ? (
            <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
              <p>{section.note}</p>
            </div>
          ) : null}

          {section.links?.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-100 transition-colors"
                >
                  {link.label}
                  {link.external ? (
                    <ExternalLink className="h-3 w-3" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function VisitorManagementDoc() {
  const [activeId, setActiveId] = useState(VISITOR_MANAGEMENT_DOC_SECTIONS[0]?.id ?? "");

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  useEffect(() => {
    const ids = VISITOR_MANAGEMENT_DOC_SECTIONS.map((s) => s.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) setActiveId(top);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-8 -mx-2 sm:mx-0">
      <div className="border border-[#e5e5e5] bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-[#e5e5e5] bg-white">
            <BookOpen className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Doc</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#1a2332] pb-3 border-b border-[#e5e5e5]">
              Smart Visitor Management guide
            </h1>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#555] leading-relaxed">
              How guests, employees, leave, GPS, CRM site visits, reports, and subscriptions work
              together in Fusion Xpress.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-[#e5e5e5] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-primary-700" />
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-gray-800">
            End-to-end flows
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {VISITOR_MANAGEMENT_DOC_FLOWS.map((flow) => (
            <div key={flow.title} className="border border-[#e5e5e5] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-primary-700 mb-3">
                {flow.title}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {flow.steps.map((step, index) => (
                  <span key={step} className="inline-flex items-center gap-1.5">
                    <span className="rounded-md bg-white border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
                      {step}
                    </span>
                    {index < flow.steps.length - 1 ? (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <nav
          className="hidden lg:block"
          aria-label="Documentation sections"
        >
          <div className="sticky top-24 border border-[#e5e5e5] bg-white p-3">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              On this page
            </p>
            <ul className="space-y-0.5 max-h-[calc(100vh-8rem)] overflow-y-auto">
              {VISITOR_MANAGEMENT_DOC_SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors ${
                      activeId === section.id
                        ? "bg-primary-50 text-primary-800"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="space-y-6 min-w-0">
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {VISITOR_MANAGEMENT_DOC_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  activeId === section.id
                    ? "border-primary-300 bg-primary-50 text-primary-800"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>

          {VISITOR_MANAGEMENT_DOC_SECTIONS.map((section) => (
            <DocSectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
