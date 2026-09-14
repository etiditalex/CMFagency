import Image from "next/image";
import { Briefcase, CalendarRange, Megaphone, Ticket } from "lucide-react";

const CARDS = [
  {
    title: "Event Planning",
    description: "We plan and manage events from first brief to last guest.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg",
    imageAlt: "Audience at a Changer Fusions event",
    icon: CalendarRange,
  },
  {
    title: "Digital Marketing",
    description: "Campaigns and tools that keep brands visible and relevant.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767153675/Global_women_impact_2_adeysa.jpg",
    imageAlt: "Guests at a Changer Fusions marketing gathering",
    icon: Megaphone,
  },
  {
    title: "Fusion Xpress",
    description: "Ticketing, attendees, and voting for shows, launches, and awards.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765892266/IMG_9928_tv36eu.jpg",
    imageAlt: "Live moment from a Changer Fusions programme",
    icon: Ticket,
  },
  {
    title: "Career Pathways",
    description: "Talent, jobs, and development that help people grow with the market.",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1768448263/HighFashionAudition20251_ufpxud.jpg",
    imageAlt: "Talent on the floor at a Changer Fusions audition",
    icon: Briefcase,
  },
] as const;

export default function WhyChangerFusionsSection() {
  return (
    <section
      className="home-why w-full bg-secondary-600 px-4 py-8 sm:px-4 sm:py-14 md:px-6 md:py-16 lg:px-8 lg:py-20"
      aria-labelledby="home-why-heading"
    >
      <h2
        id="home-why-heading"
        className="mb-5 font-montserrat text-[1.65rem] font-bold text-white sm:mb-10 sm:text-4xl md:mb-12 md:text-5xl"
      >
        Why Changer Fusions?
      </h2>

      <div className="grid w-full grid-cols-2 gap-x-2.5 gap-y-9 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-5">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="relative pb-6 sm:pb-8">
              <div className="relative aspect-[3/4] overflow-hidden sm:aspect-[4/5]">
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  className="object-cover object-center"
                  quality={75}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/55" aria-hidden />
                <div className="relative z-10 flex h-full flex-col items-center px-2 pt-5 text-center sm:px-6 sm:pt-12">
                  <h3 className="font-montserrat text-[0.85rem] font-bold leading-tight text-white sm:text-2xl">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 max-w-[16rem] text-[0.7rem] leading-snug text-white sm:mt-3 sm:text-[0.95rem] sm:leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-1/2 z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-white text-secondary-600 shadow-sm sm:h-[4.75rem] sm:w-[4.75rem]"
                aria-hidden
              >
                <Icon className="h-5 w-5 sm:h-8 sm:w-8" strokeWidth={1.8} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
