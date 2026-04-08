import Link from "next/link";

/**
 * Original, crawlable copy on /blogs so the listing page carries editorial depth beyond post cards.
 */
export default function BlogListingEditorialIntro() {
  return (
    <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 mb-6 sm:mb-8">
    <article className="rounded-2xl border border-gray-200/80 bg-white/95 backdrop-blur-sm p-6 shadow-sm md:p-8">
      <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
        Ideas for growing brands in Kenya and beyond
      </h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-700 md:text-base">
        <p>
          This section is where we publish practical notes from our work: how we plan campaigns, what we are seeing in
          digital and events, and frameworks that help clients make faster decisions. Articles are written for marketers,
          founders, and programme leads—whether you run a retail chain on the coast, a Nairobi-based SaaS team, or a
          one-off cultural event that still needs ticket sales and press.
        </p>
        <p>
          Expect a mix of strategy pieces, channel tips, and post-mortems from real launches. If you are new here, browse
          by topic using the categories on each card, or start from our{" "}
          <Link href="/services/digital-marketing" className="font-semibold text-primary-600 underline hover:text-primary-700">
            services overview
          </Link>{" "}
          to see how engagement on the blog connects to retainers and project work. We also announce public milestones on{" "}
          <Link href="/events" className="font-semibold text-primary-600 underline hover:text-primary-700">
            Events
          </Link>{" "}
          and share hiring context alongside the{" "}
          <Link href="/jobs" className="font-semibold text-primary-600 underline hover:text-primary-700">
            job board
          </Link>
          .
        </p>
        <p className="text-gray-600">
          Want a topic covered? Message{" "}
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
          . We read every serious note; commissioning and PR pitches are filtered separately from reader questions.
        </p>
      </div>
    </article>
    </div>
  );
}
