import Image from "next/image";
import Link from "next/link";
import { Briefcase, CalendarRange, Megaphone, Ticket } from "lucide-react";

const CARDS = [
  {
    title: "Event Planning",
    description: "We plan and manage events from first brief to last guest.",
    href: "/services/events-marketing",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1790921512/Event_Planing_viauy1.jpg",
    imageAlt: "Event team setting a banquet table",
    icon: CalendarRange,
  },
  {
    title: "Digital Marketing",
    description: "Campaigns and tools that keep brands visible and relevant.",
    href: "/services/digital-marketing",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1790921512/Digital_marketing_p7xudv.jpg",
    imageAlt: "Marketer reviewing campaign results on a laptop and phone",
    icon: Megaphone,
  },
  {
    title: "Fusion Xpress",
    description: "Ticketing, attendees, and voting for shows, launches, and awards.",
    href: "/fusion-xpress",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1790921512/fusion_xpress_wtsyto.jpg",
    imageAlt: "Guest scanning a ticket QR code at an event entrance",
    icon: Ticket,
  },
  {
    title: "Career Pathways",
    description: "Talent, jobs, and development that help people grow with the market.",
    href: "/careers",
    image:
      "https://res.cloudinary.com/dyfnobo9r/image/upload/v1790921512/career_pathways_nxchmp.jpg",
    imageAlt: "Facilitator leading a career pathways session",
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
        className="mb-5 overflow-visible px-1 font-montserrat text-[1.55rem] font-bold leading-snug text-white sm:mb-10 sm:text-4xl md:mb-12 md:text-5xl"
      >
        Why Changer Fusions?
      </h2>

      <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-5">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group relative block pb-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:pb-8"
            >
              <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[3/4]">
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                  quality={75}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/55 transition-colors group-hover:bg-black/45" aria-hidden />
                <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 py-4 text-center sm:justify-start sm:px-6 sm:pt-12">
                  <h3 className="overflow-visible px-0.5 font-montserrat text-lg font-bold leading-snug text-white sm:text-sm md:text-lg lg:text-2xl">
                    {card.title}
                  </h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white sm:mt-2 sm:max-w-[16rem] sm:text-xs md:text-[0.95rem]">
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
            </Link>
          );
        })}
      </div>
    </section>
  );
}
