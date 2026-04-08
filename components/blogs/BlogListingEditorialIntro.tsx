import Link from "next/link";

/**
 * Original, crawlable copy on /blogs so the listing page carries editorial depth beyond post cards.
 */
export default function BlogListingEditorialIntro() {
  return (
    <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 mb-6 sm:mb-8">
    <article className="rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm md:p-8">
      <h1 className="text-left text-xl font-bold text-gray-900 md:text-2xl">
        Ideas for growing brands in Kenya and beyond
      </h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-700 md:text-base">
        <p>
          We publish practical notes from real campaign, digital, and event work to help marketers, founders, and programme
          leads make faster decisions.
        </p>
        <p>
          Start with the categories on each card, then explore our{" "}
          <Link href="/services/digital-marketing" className="font-semibold text-primary-600 underline hover:text-primary-700">
            services overview
          </Link>{" "}
          for full delivery context. We also share milestones on{" "}
          <Link href="/events" className="font-semibold text-primary-600 underline hover:text-primary-700">
            Events
          </Link>{" "}
          and hiring updates on the{" "}
          <Link href="/jobs" className="font-semibold text-primary-600 underline hover:text-primary-700">
            job board
          </Link>
          .
        </p>
        <p className="text-gray-600">
          Want a topic covered? Email{" "}
          <a
            href="mailto:info@cmfagency.co.ke"
            className="font-semibold text-primary-600 underline hover:text-primary-700"
          >
            info@cmfagency.co.ke
          </a>{" "}
          or reach us through{" "}
          <Link href="/contact" className="font-semibold text-primary-600 underline hover:text-primary-700">
            Contact
          </Link>
          .
        </p>
      </div>
    </article>
    </div>
  );
}
