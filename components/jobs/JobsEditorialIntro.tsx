import Link from "next/link";

/**
 * Original, crawlable copy for /jobs so the job board is not only syndicated listings.
 */
export function JobsEditorialIntro() {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-lg font-bold text-gray-900 md:text-xl">How this job board works</h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-700 md:text-base">
        <p>
          Changer Fusions runs this board for{" "}
          <strong className="font-semibold text-gray-900">job seekers and employers in Kenya</strong>
          —and for anyone targeting <strong className="font-semibold text-gray-900">remote roles</strong> that fit East
          African time zones. You will see two kinds of listings: vacancies posted directly by employers on our platform,
          and selected roles aggregated from partner feeds when API keys are configured. Aggregated posts always link out
          to the original employer or partner site to apply; we do not replace their application process.
        </p>
        <p>
          Our team is based in <strong className="font-semibold text-gray-900">Mombasa</strong> with work across
          Nairobi, the coast, and national campaigns. If you are hiring for marketing, events, creative production, or
          digital roles, posting here puts your role next to curated international remote listings so candidates can
          compare <strong className="font-semibold text-gray-900">salary bands, contract types</strong>, and
          locations in one search—without juggling dozens of bookmarked job sites.
        </p>
        <p>
          For <strong className="font-semibold text-gray-900">candidates</strong>, use keyword search for titles and
          stacks you care about, then try the profile matcher: paste a short summary of your experience (role, city,
          tools, industries) and we reorder suggestions to surface better semantic fits. Always verify listing details on
          the employer&apos;s page before sharing personal data or paying any fee—legitimate employers in Kenya
          generally do not charge you to apply.
        </p>
        <p>
          Changer Fusions also operates{" "}
          <Link href="/talent" className="font-semibold text-primary-600 underline hover:text-primary-700">
            talent and casting
          </Link>{" "}
          for events and brands, a separate track from salaried job search. If you are looking for representation or
          event registration (for example awards categories), use those pages; if you are looking for a full-time or
          contract job, stay on this board.
        </p>
        <p className="text-gray-600">
          Questions about a specific post? Use the apply or company link on the card. For platform or partnership
          enquiries, contact{" "}
          <a href="mailto:info@cmfagency.co.ke" className="font-semibold text-primary-600 underline hover:text-primary-700">
            info@cmfagency.co.ke
          </a>{" "}
          or visit{" "}
          <Link href="/contact" className="font-semibold text-primary-600 underline hover:text-primary-700">
            Contact
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
