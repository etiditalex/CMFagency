import Link from "next/link";
import { montserratHeavyItalic, playfair } from "@/lib/site-fonts";

export default function FashionNightStory() {
  return (
    <section className={`fashion-night-story bg-white ${playfair.className}`} aria-labelledby="fashion-night-story-heading">
      <h2 id="fashion-night-story-heading" className="sr-only">
        About the Coast Fashion and Modelling Awards 2025
      </h2>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-12 sm:gap-12 sm:px-10 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:px-14 lg:py-28">
        <div className="space-y-10">
          <p>
            The Coast Fashions and Modelling Awards 2025 was a glamorous celebration of excellence in the fashion and
            modelling industry along the Kenyan coast. It was the first Coast Fashion and Modelling Awards, a contestant
            awards and fashion showcase. The ceremony recognised and honoured the outstanding achievements of designers,
            models, stylists, photographers, and other professionals who have made significant contributions to the
            fashion industry in the region.
          </p>
          <p>
            Scheduled for 15 May 2025 in the Coast Region, Kenya, the night featured stunning fashion showcases, runway
            presentations, and award ceremonies. Those segments highlighted creativity, innovation, and excellence in
            fashion design and modelling. Centred on <strong>coast talent, heritage, and modelling</strong>, the awards
            celebrated the vibrant fashion scene on the coast.
          </p>
        </div>
        <div>
          <p>
            The Coast Fashion and Modelling Awards 2025 brought together industry professionals, fashion enthusiasts,
            and supporters to recognise those who are shaping the future of fashion in Kenya. Highlights from the night
            showed talent, heritage, and a packed house, from the high fashion audition and the runway to the awards
            night audience and production.
          </p>
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl justify-center px-4 pb-14 sm:px-10 sm:pb-20 lg:pb-24">
        <Link
          href="/contact"
          className={`fn-sponsor group relative inline-block -rotate-6 no-underline transition-transform duration-300 hover:-rotate-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f6bff] ${montserratHeavyItalic.className}`}
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
