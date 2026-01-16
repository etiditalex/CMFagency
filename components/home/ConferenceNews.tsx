import Image from "next/image";
import Link from "next/link";

const items = [
  {
    title: "Coast Fashion and Modelling Awards 2026 (CFMA 2026)",
    day: "15",
    month: "AUG",
    meta: "Mombasa, Kenya • 2026",
    href: "/events/upcoming",
    featured: true,
  },
  {
    title: "Marketing Campaign Launch",
    day: "05",
    month: "DEC",
    meta: "Nairobi, Kenya",
    href: "/events/11",
  },
  {
    title: "Leadership Development Seminar",
    day: "08",
    month: "NOV",
    meta: "University Campus",
    href: "/events/15",
  },
  {
    title: "Joint Promotional Launch",
    day: "22",
    month: "NOV",
    meta: "Nairobi, Kenya",
    href: "/events/13",
  },
  {
    title: "Skill-Building Workshop Series",
    day: "10",
    month: "DEC",
    meta: "University Campus",
    href: "/events/17",
  },
  {
    title: "Student Engagement Drive",
    day: "15",
    month: "DEC",
    meta: "University Campus",
    href: "/events/21",
  },
  {
    title: "Mr and Miss Culture Subaland",
    day: "05",
    month: "NOV",
    meta: "Subaland Region",
    href: "/events/6",
  },
  {
    title: "Marketing Society Networking Mixer",
    day: "15",
    month: "OCT",
    meta: "Nairobi, Kenya",
    href: "/events/8",
  },
];

export default function ConferenceNews() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448265/HighFashionAudition202514_kwly2p.jpg"
          alt="Conference background"
          fill
          className="object-cover object-center"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-black/70" />
        <div className="absolute inset-0 bg-primary-950/20" />
      </div>

      <div className="container-custom relative z-10 py-14 md:py-20">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-wide text-white">
            CONFERENCE <span className="text-secondary-300">NEWS</span>
          </h2>
          <div className="mt-4 flex justify-center">
            <div className="relative">
              <div className="h-1.5 w-28 rounded-full bg-secondary-500" />
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-secondary-500" />
            </div>
          </div>
          <p className="mt-5 text-white/85 max-w-3xl mx-auto">
            Latest updates and key upcoming events — featuring <span className="font-semibold text-white">CFMA 2026</span>.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {items.map((item) => (
            <Link
              key={`${item.title}-${item.day}-${item.month}`}
              href={item.href}
              className="group flex items-start gap-5"
            >
              {/* Date badge */}
              <div
                className={[
                  "w-20 h-20 flex-shrink-0 grid place-items-center text-center",
                  "border-4 rounded-md shadow-lg",
                  item.featured
                    ? "bg-secondary-600 border-white/80"
                    : "bg-primary-600 border-white/80",
                ].join(" ")}
              >
                <div className="text-white font-extrabold leading-none">
                  <div className="text-2xl">{item.day}</div>
                  <div className="text-sm tracking-widest">{item.month}</div>
                </div>
              </div>

              {/* Text */}
              <div className="min-w-0">
                <div
                  className={[
                    "font-bold leading-snug text-white",
                    "group-hover:text-secondary-200 transition-colors",
                    item.featured ? "text-base" : "text-base",
                  ].join(" ")}
                >
                  {item.title}
                </div>
                <div className="mt-2 text-sm text-white/75">{item.meta}</div>
                {item.featured && (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 border border-white/20 rounded-full px-3 py-1">
                    Featured upcoming event
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary-300" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/events?filter=upcoming"
            className="inline-flex items-center justify-center rounded-lg bg-white text-primary-700 hover:bg-gray-100 font-semibold px-7 py-3 shadow-lg"
          >
            View All Upcoming Events
          </Link>
        </div>
      </div>
    </section>
  );
}

