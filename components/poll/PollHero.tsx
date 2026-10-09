"use client";

import Image from "next/image";
import Link from "next/link";

const HERO_IMAGE = "/images/poll-hero-ballot.jpg";

export default function PollHero() {
  return (
    <section
      className="poll-hero relative w-full overflow-hidden bg-primary-950 pt-[var(--site-nav-height)]"
      aria-labelledby="poll-hero-heading"
    >
      <div className="relative mx-auto grid max-w-[1440px] lg:min-h-[36rem] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="relative z-10 flex items-center px-4 py-10 sm:px-10 sm:py-16 lg:px-14 lg:py-20 xl:px-20">
          <div className="w-full max-w-[34rem]">
            <h1
              id="poll-hero-heading"
              className="font-montserrat text-[2rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.15rem]"
            >
              <span className="block text-white">Create a poll</span>
              <span className="block text-primary-200">in seconds</span>
            </h1>

            <p className="mt-5 max-w-[32rem] text-[15px] font-medium leading-relaxed text-white/90 sm:mt-6 sm:text-[17px] sm:leading-[1.55]">
              Want to ask your audience who should take the runway or which session to run next? Create a poll — and get answers in no time.
            </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/poll/create"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-white px-5 py-2.5 text-[15px] font-semibold text-primary-950 shadow-sm transition-colors hover:bg-primary-50 sm:w-auto"
                >
                  Create a poll
                </Link>
                <Link
                  href="/poll/live"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-600 px-5 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-primary-500 sm:w-auto"
                >
                  Live Polls
                </Link>
              </div>

              <p className="poll-hero-note mt-3.5 text-[13px] font-medium text-white/55">No signup required</p>
          </div>
        </div>

        <div className="relative min-h-[16.5rem] sm:min-h-[20rem] lg:min-h-full">
          <Image
            src={HERO_IMAGE}
            alt="A hand dropping a ballot into a box"
            fill
            priority
            className="object-cover object-right sm:object-[72%_center] lg:object-right"
            sizes="(max-width: 1024px) 100vw, 58vw"
          />
          <div className="absolute inset-0 bg-primary-900/35 mix-blend-multiply" aria-hidden />
          <div
            className="absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-r from-primary-950 to-transparent lg:block xl:w-36"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary-950 to-transparent lg:hidden"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
