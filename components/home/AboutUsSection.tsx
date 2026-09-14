import { FileText, List, Send } from "lucide-react";

const VISION =
  "To be the driving force behind businesses' success in a dynamic and ever-evolving market landscape.";

const MISSION =
  "To harness marketing as the catalyst for change and innovation, empowering businesses to thrive and define their existence in the marketplace.";

const PROMISE_ITEMS = [
  "Plan events with care from first brief to last guest.",
  "Promote brands with digital marketing that stays relevant.",
  "Grow results through Fusion Xpress ticketing and campaign tools.",
];

export default function AboutUsSection() {
  return (
    <section
      className="home-about bg-primary-50 py-8 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="home-about-heading"
    >
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <h2
          id="home-about-heading"
          className="mb-5 font-montserrat text-[1.65rem] font-bold text-primary-600 sm:mb-10 sm:text-4xl md:mb-12"
        >
          About Us
        </h2>

        <div className="grid grid-cols-1 overflow-hidden bg-white shadow-sm md:grid-cols-3">
          <article className="flex flex-col items-center bg-white px-4 py-6 text-center sm:px-10 sm:py-14">
            <Send
              className="mb-4 h-10 w-10 -rotate-45 text-primary-600 sm:mb-8 sm:h-12 sm:w-12"
              strokeWidth={1.6}
              aria-hidden
            />
            <h3 className="mb-2 font-montserrat text-xl font-bold text-gray-900 sm:text-2xl">Our Vision</h3>
            <p className="mb-5 font-semibold text-secondary-600">Market to thrive</p>
            <p className="max-w-xs text-[0.95rem] leading-relaxed text-gray-600">{VISION}</p>
          </article>

          <article className="flex flex-col items-center bg-primary-800 px-4 py-6 text-center sm:px-10 sm:py-14">
            <FileText
              className="mb-4 h-10 w-10 text-white sm:mb-8 sm:h-12 sm:w-12"
              strokeWidth={1.6}
              aria-hidden
            />
            <h3 className="mb-2 font-montserrat text-xl font-bold text-white sm:text-2xl">Our Mission</h3>
            <p className="mb-5 font-semibold text-secondary-300">Market to exist</p>
            <p className="max-w-xs text-[0.95rem] leading-relaxed text-white/95">{MISSION}</p>
          </article>

          <article className="flex flex-col items-center bg-white px-4 py-6 text-center sm:px-10 sm:py-14">
            <List
              className="mb-4 h-10 w-10 text-primary-600 sm:mb-8 sm:h-12 sm:w-12"
              strokeWidth={1.6}
              aria-hidden
            />
            <h3 className="mb-2 font-montserrat text-xl font-bold text-gray-900 sm:text-2xl">Our Promise</h3>
            <p className="mb-5 font-semibold text-secondary-600">Plan • Promote • Grow</p>
            <ul className="mx-auto w-fit max-w-xs space-y-2.5 text-left text-[0.95rem] leading-relaxed text-gray-600">
              {PROMISE_ITEMS.map((item) => (
                <li key={item} className="flex !text-left gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary-500" aria-hidden />
                  <span className="!text-left">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
