import { Montserrat, Playfair_Display } from "next/font/google";
import Link from "next/link";

const storySerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: "normal",
  display: "swap",
});

const sponsorFace = Montserrat({
  subsets: ["latin"],
  weight: "800",
  style: "italic",
  display: "swap",
});

export default function FashionShowStory() {
  return (
    <section className={`fashion-night-story bg-white ${storySerif.className}`} aria-labelledby="fashion-show-story-heading">
      <h2 id="fashion-show-story-heading" className="sr-only">
        About the Coast Fashion and Modelling Awards 2026
      </h2>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:gap-12 sm:px-10 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:px-14 lg:py-28">
        <div className="space-y-10">
          <p>
            The Coast Fashion and Modelling Awards were held on 15 August 2026 in Mombasa, a flagship night for{" "}
            <strong>coastal heritage, youth talent, and sustainable fashion</strong>. CFMA 2026 was a premier creative
            industry event organized by Changer Fusions, building on the 2025 edition, which hosted over 350
            participants and awarded 30 outstanding contributors in fashion and modelling.
          </p>
          <p>
            It was a platform for coastal heritage, youth talent, sustainable fashion, and eco-tourism, and one of the
            premier events in Mombasa in 2026. The night began at 6:50 PM at City Blue Creekside Hotel.
          </p>
        </div>
        <div>
          <p>
            CFMA is more than a runway. It is how the Coast shows its designers, models, and culture to Kenya and the
            region. The night brings heritage-inspired and eco-conscious fashion showcases, modelling competitions for
            emerging and professional models, cultural performances of music, dance, and traditional arts, an awards
            ceremony across more than 30 categories, and eco-tourism exhibitions of coastal destinations and
            conservation.
          </p>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-14 sm:px-10 sm:pb-20 lg:pb-24">
        <Link
          href="/contact"
          className={`fn-sponsor group relative inline-block -rotate-6 no-underline transition-transform duration-300 hover:-rotate-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f6bff] ${sponsorFace.className}`}
        >
          <span className="absolute -left-3 -top-3 block h-full w-full bg-[#2f6bff]" aria-hidden />
          <span className="relative block bg-[#f6a21a] px-4 py-3 text-white shadow-sm sm:px-9 sm:py-3.5">
            Become A Sponsor
            <span className="fn-bang">!</span>
          </span>
        </Link>
      </div>
    </section>
  );
}
