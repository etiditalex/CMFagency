import Link from "next/link";

const YOUTUBE_ID = "IxGC31vxQtU";

export default function AugustEventSection() {
  return (
    <section
      className="home-august-event overflow-x-clip bg-white py-8 sm:py-16 md:py-20 lg:py-24"
      aria-labelledby="home-august-event-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 sm:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-x-14 xl:gap-x-16">
          <div className="min-w-0">
            <p className="home-kicker mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#1a8a3e] sm:mb-5 sm:text-xs">
              About us
            </p>
            <h2
              id="home-august-event-heading"
              className="font-montserrat text-[clamp(1.45rem,7.4vw,1.85rem)] font-bold uppercase leading-[1.05] tracking-tight text-neutral-950 sm:text-4xl sm:leading-[1.02] md:text-[2.65rem] lg:text-[2.85rem] xl:text-[3.15rem]"
            >
              <span className="block">Event Planning,</span>
              <span className="block">Ticketing, and</span>
              <span className="block">Smart Systems</span>
            </h2>
            <div className="mt-6 max-w-xl space-y-4 text-[0.95rem] leading-[1.7] text-neutral-600 sm:mt-7 sm:text-base sm:leading-8">
              <p>
                Changer Fusions plans and manages events from the first brief to the last guest.
                Fusion Xpress covers ticketing and voting for shows, launches, awards, and fan
                programmes, so a ticket sale and a vote sit in the same place.
              </p>
              <p>
                The Smart Management System looks after visitors, guests, and employees: pre-registration,
                gate check-in, digital passes, attendance, and live reports. Planning, ticketing, voting,
                and day-of management stay on one workflow.
              </p>
            </div>
            <Link
              href="/about"
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#1a8a3e] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#146e32] sm:mt-10 sm:w-auto sm:px-8 sm:text-[0.95rem]"
            >
              Learn more
            </Link>
          </div>

          <div className="w-full lg:pt-9">
            <div className="relative aspect-video w-full overflow-hidden bg-neutral-950">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${YOUTUBE_ID}`}
                title="Changer Fusions on YouTube"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
