import Image from "next/image";
import Link from "next/link";

const CARDS = [
  {
    title: "Event Planning",
    description: "We plan and manage events from first brief to last guest.",
    href: "/services/events-marketing",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_3_puyiot.jpg",
    imageAlt: "Models on stage at a Coast fashion show",
  },
  {
    title: "Digital Marketing",
    description: "Campaigns and tools that keep brands visible and relevant.",
    href: "/services/digital-marketing",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_1_n4ow6e.jpg",
    imageAlt: "Videographer filming a Changer Fusions event",
  },
  {
    title: "Fusion Xpress",
    description: "Ticketing, attendees, and voting for shows, launches, and awards.",
    href: "/fusion-xpress",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396192/Homepage_5_ut7g6w.jpg",
    imageAlt: "Guests seated together at a Changer Fusions gathering",
  },
  {
    title: "Career Pathways",
    description: "Talent, jobs, and development that help people grow with the market.",
    href: "/careers",
    image: "https://res.cloudinary.com/dyfnobo9r/image/upload/v1794396193/Homepage_2_pfpccl.jpg",
    imageAlt: "Participants in a Changer Fusions workshop",
  },
] as const;

export default function WhyChangerFusionsSection() {
  return (
    <section className="home-why home-band home-band-ink home-arch w-full" aria-labelledby="home-why-heading">
      <div className="home-shell">
        <h2 id="home-why-heading" className="home-display max-w-3xl text-white">
          How we deliver
        </h2>
        <p className="home-lead mt-6 max-w-3xl text-white/75">
          Event planning, digital marketing, Fusion Xpress, and career pathways stay with one team,
          from the first brief to the last guest.
        </p>
        <div className="home-eco-grid">
          {CARDS.map((card) => (
            <Link key={card.title} href={card.href} className="home-eco">
              <span className="home-eco-ph">
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  quality={90}
                  className="object-cover object-center"
                  sizes="(max-width: 700px) 100vw, 25vw"
                />
              </span>
              <span className="home-eco-tx">
                <span className="home-eco-co">{card.title}</span>
                <strong>{card.description}</strong>
                <span className="home-eco-v">
                  View <span aria-hidden>↗</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
