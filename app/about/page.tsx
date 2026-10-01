import Image from "next/image";
import Link from "next/link";

const BANNER_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955875/WhatsApp_Image_2025-12-17_at_9.33.02_AM_cjrrxx.jpg";

const CORE_VALUES = [
  "Innovation",
  "Integrity",
  "Excellence",
  "Client-Centricity",
  "Impact & Results",
] as const;

const STRATEGIC_FOCUS = [
  { label: "Digital Marketing", href: "/services/digital-marketing" },
  { label: "Website Development", href: "/services/website-development" },
  { label: "Branding & Creative", href: "/services/branding" },
] as const;

const ENABLERS = [
  { label: "Events Marketing", href: "/services/events-marketing" },
  { label: "Market Research", href: "/services/market-research" },
  { label: "Content Creation", href: "/services/content-creation" },
] as const;

const MILESTONE_TONES = [
  { marker: "bg-gray-900", year: "text-gray-900" },
  { marker: "bg-primary-600", year: "text-primary-600" },
  { marker: "bg-accent-green", year: "text-accent-green" },
] as const;

const MILESTONES = [
  {
    year: "2018",
    points: [
      "Changer Fusions was founded, beginning our journey as a marketing strategic partner.",
      "A vision to blend innovative marketing techniques and transformative strategies.",
    ],
  },
  {
    year: "2019",
    points: [
      "Launched our first digital marketing campaigns.",
      "Established partnerships with local businesses and set the foundation for our marketing services.",
    ],
  },
  {
    year: "2020",
    points: [
      "Expanded our services to include website development and design.",
      "Helped businesses establish their online presence during a critical period of digital transformation.",
    ],
  },
  {
    year: "2021",
    points: [
      "Introduced branding and creative services.",
      "Helped businesses develop strong brand identities and visual communication strategies.",
    ],
  },
  {
    year: "2022",
    points: [
      "Launched market research and analysis services.",
      "Provided data-driven insights to help businesses make informed marketing decisions.",
    ],
  },
  {
    year: "2023",
    points: [
      "Expanded into events marketing.",
      "Launched The Coast Fashion and Modeling Awards and established our presence in the events sector.",
    ],
  },
  {
    year: "2024",
    points: [
      "Mr and Miss Mombasa International Show.",
      "Marketing Society of Kenya workshops.",
      "King Experience live concert, corporate partnerships, educational forums, and student engagement events.",
    ],
  },
  {
    year: "2025",
    points: [
      "Launching the Changer Fusions Gala Awards 2025.",
      "An immersive journey for young leaders and creatives focused on sustainable fashion, leadership, and climate advocacy.",
    ],
  },
] as const;

function FocusHeading({ id, children }: { id: string; children: string }) {
  return (
    <div className="text-center">
      <h2 id={id} className="font-montserrat text-2xl font-extrabold text-gray-900 md:text-3xl">
        {children}
      </h2>
      <span className="mx-auto mt-2.5 block h-[3px] w-12 bg-primary-600" />
    </div>
  );
}

function FocusColumns({ items }: { items: readonly { label: string; href: string }[] }) {
  return (
    <ul className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 md:mt-12">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="text-[0.95rem] text-gray-700 transition-colors hover:text-primary-700 md:text-base">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function VisionIcon() {
  return (
    <svg viewBox="0 0 80 80" className="mx-auto h-[4.25rem] w-[4.25rem] text-accent-green md:h-[4.75rem] md:w-[4.75rem]" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M40 16c-16.8 0-29.2 12.6-33.4 22.2C10.8 47.8 23.2 60.4 40 60.4s29.2-12.6 33.4-22.2C69.2 28.6 56.8 16 40 16zm0 33.2a11 11 0 1 1 0-22 11 11 0 0 1 0 22z"
      />
      <circle cx="40" cy="38.2" r="5.6" fill="currentColor" />
    </svg>
  );
}

function MissionIcon() {
  return (
    <svg viewBox="0 0 80 80" className="mx-auto h-[4.25rem] w-[4.25rem] md:h-[4.75rem] md:w-[4.75rem]" aria-hidden="true">
      <circle cx="40" cy="40" r="26" className="fill-accent-green" />
      <circle cx="40" cy="40" r="15" className="fill-white" />
      <circle cx="40" cy="40" r="7.5" className="fill-accent-green" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white pb-[calc(var(--site-mobile-dock-height)+1.5rem)] pt-[var(--site-nav-height)] md:pb-0">
      <section className="about-banner relative h-16 overflow-hidden sm:h-20 md:h-24" aria-label="About us">
        <Image
          src={BANNER_IMAGE}
          alt="Changer Fusions at work"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/30 to-black/10" />
        <div className="relative flex h-full items-center px-6 sm:px-10 lg:px-16 xl:px-24">
          <h1 className="font-montserrat text-3xl font-extrabold tracking-wide text-white sm:text-4xl md:text-5xl">
            ABOUT US
          </h1>
        </div>
      </section>

      <section className="about-pillars px-4 py-14 sm:px-6 sm:py-16 md:py-20 lg:px-8" aria-label="Vision, mission, and core values">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-14 md:grid-cols-3 md:items-start md:gap-8 lg:gap-12">
          <article className="text-center">
            <div className="flex h-28 items-center justify-center md:h-32">
              <VisionIcon />
            </div>
            <h2 className="mt-5 font-montserrat text-xl font-bold text-gray-900 md:text-2xl">Vision</h2>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-gray-600 md:text-[0.95rem]">
              To be the driving force behind businesses&apos; success in a dynamic and ever-evolving market landscape.
            </p>
          </article>

          <article className="text-center">
            <div className="flex h-28 items-center justify-center md:h-32">
              <MissionIcon />
            </div>
            <h2 className="mt-5 font-montserrat text-xl font-bold text-gray-900 md:text-2xl">Mission</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-gray-600 md:text-[0.95rem]">
              To harness marketing as the catalyst for change and innovation, empowering businesses to thrive and define
              their existence in the marketplace.
            </p>
          </article>

          <article className="text-center">
            <div className="flex h-28 items-center justify-center md:h-32">
              <p className="font-montserrat text-5xl font-black leading-none tracking-tight text-accent-green md:text-[3.4rem]">
                VALUES
              </p>
            </div>
            <h2 className="mt-5 font-montserrat text-xl font-bold text-gray-900 md:text-2xl">Core Values</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-gray-600 md:text-[0.95rem]">
              {CORE_VALUES.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="about-focus px-4 pb-16 sm:px-6 md:pb-24 lg:px-8" aria-labelledby="strategic-focus-heading">
        <FocusHeading id="strategic-focus-heading">Strategic Focus</FocusHeading>
        <FocusColumns items={STRATEGIC_FOCUS} />

        <div className="mt-3 md:mt-4">
          <FocusHeading id="enablers-heading">Our Enablers</FocusHeading>
          <FocusColumns items={ENABLERS} />
        </div>

      </section>

      <section className="about-years bg-[#f4f4f4] px-4 py-16 sm:px-8 md:py-24 lg:px-16" aria-labelledby="over-the-years-heading">
        <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-[minmax(14rem,22rem)_1fr] md:gap-8 lg:gap-20">
          <div className="pt-1">
            <p className="text-[0.95rem] font-medium text-primary-600">Our Story</p>
            <h2
              id="over-the-years-heading"
              className="mt-5 font-montserrat text-[3.35rem] font-black uppercase leading-[0.86] tracking-tight text-gray-800 sm:text-6xl lg:text-7xl xl:text-[4.85rem]"
            >
              Over
              <br />
              the
              <br />
              years
            </h2>
          </div>

          <ol className="about-years-track relative">
            {MILESTONES.map((milestone, index) => {
              const tone = MILESTONE_TONES[index % MILESTONE_TONES.length];
              return (
                <li key={milestone.year} className="relative pb-8 pl-9 last:pb-2">
                  <span className={`about-years-marker ${tone.marker}`} aria-hidden="true" />
                  <h3 className={`font-montserrat text-[0.95rem] font-bold ${tone.year}`}>{milestone.year}</h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[0.8rem] leading-relaxed text-gray-700 md:text-[0.85rem]">
                    {milestone.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 md:pb-24 lg:px-8">
        <div className="mx-auto mt-14 max-w-5xl overflow-hidden bg-primary-600">
          <div className="flex flex-col items-center justify-between gap-5 px-6 py-8 md:flex-row md:px-10">
            <p className="text-center text-xl font-bold text-white md:text-left md:text-2xl">
              Looking to advance your skills?
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center justify-center bg-white px-10 py-4 font-bold text-gray-900 shadow-md transition-colors hover:bg-gray-100"
            >
              Explore Careers
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
