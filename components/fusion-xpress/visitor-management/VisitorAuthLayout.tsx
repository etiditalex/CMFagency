"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { VISITOR_SHOWCASE_STEPS } from "@/lib/visitors/showcase-steps";

type VisitorAuthLayoutProps = {
  mode: "sign-in" | "sign-up";
  children: React.ReactNode;
};

export default function VisitorAuthLayout({ mode, children }: VisitorAuthLayoutProps) {
  const [slide, setSlide] = useState(0);
  const step = VISITOR_SHOWCASE_STEPS[slide];
  const total = VISITOR_SHOWCASE_STEPS.length;

  const goPrev = () => setSlide((s) => (s - 1 + total) % total);
  const goNext = () => setSlide((s) => (s + 1) % total);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-white">
      <header className="sticky top-0 z-20 shrink-0 border-b border-gray-100 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-3 py-2.5 sm:px-6 sm:py-3">
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-in"
              className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold sm:px-0 ${
                mode === "sign-in" ? "text-primary-700" : "text-gray-500 hover:text-primary-700"
              }`}
            >
              Sign In
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <Link
              href="/fusion-xpress/smart-visitor-management/sign-up"
              className={`inline-flex min-h-[44px] items-center px-1 text-sm font-semibold sm:px-0 ${
                mode === "sign-up" ? "text-primary-700" : "text-gray-500 hover:text-primary-700"
              }`}
            >
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <section className="order-1 flex min-h-0 flex-col lg:order-2 lg:overflow-y-auto">
          <div className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-8 lg:px-12 lg:py-10 xl:px-16">
            <Link
              href="/fusion-xpress/smart-visitor-management"
              className="inline-flex min-h-[44px] items-center"
            >
              <Image
                src={BRAND_LOGO_URL}
                alt="Changer Fusions"
                width={200}
                height={56}
                className="h-10 w-auto object-contain sm:h-12"
                priority
              />
            </Link>
            {children}
          </div>
        </section>

        <aside className="order-2 relative flex flex-col justify-center bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900 px-4 py-8 text-white sm:px-6 sm:py-10 lg:order-1 lg:px-10 lg:py-12 xl:px-14">
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2.5 hover:bg-white/20 active:bg-white/25 lg:flex"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2.5 hover:bg-white/20 active:bg-white/25 lg:flex"
            aria-label="Next step"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mx-auto w-full max-w-md">
            <h2 className="text-center text-lg font-extrabold leading-snug text-secondary-300 sm:text-xl md:text-2xl lg:text-3xl">
              How Fusion Xpress Visitor Management works
            </h2>

            <div className="mt-6 space-y-5 sm:mt-8 sm:space-y-6 lg:mt-10 lg:space-y-8">
              <div className="text-center lg:text-left">
                <p className="text-base font-bold text-secondary-300 sm:text-lg">
                  {slide + 1}. {step.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-[0.9375rem]">
                  {step.description}
                </p>
              </div>

              <div className="flex justify-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-white/20 bg-white/10 shadow-lg sm:h-40 sm:w-40 lg:h-48 lg:w-48">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 128px, 192px"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3 sm:mt-8">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/25 bg-white/10 p-2.5 lg:hidden"
                aria-label="Previous step"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex flex-wrap justify-center gap-2">
                {VISITOR_SHOWCASE_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSlide(i)}
                    className={`min-h-[10px] rounded-full transition-all ${
                      i === slide ? "w-8 bg-secondary-400" : "w-2.5 bg-white/35 hover:bg-white/50"
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={i === slide ? "step" : undefined}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/25 bg-white/10 p-2.5 lg:hidden"
                aria-label="Next step"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
