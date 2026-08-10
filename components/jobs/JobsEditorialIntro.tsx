import Link from "next/link";

/**
 * Original, crawlable copy for /jobs so the job board is not only syndicated listings.
 */
export function JobsEditorialIntro() {
  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 shadow-sm md:p-8">
      <h1 className="text-left text-2xl font-bold text-gray-900 md:text-3xl">
        Jobs in Kenya &amp; remote
      </h1>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-gray-700 md:text-base">
        <p>
          Browse employer vacancies on the Changer Fusions job board alongside curated remote and partner listings.
          Search Nairobi, Mombasa, work-from-home, and international roles in tech, marketing, events, creative, and
          education.
        </p>
        <p>
          Internship and industrial attachment roles are free to view. Full-time, part-time, and contract vacancies may
          require an annual job-board membership after you{" "}
          <Link href="/application" className="font-semibold text-primary-600 underline hover:text-primary-700">
            join the talent pool
          </Link>
          . Employers can register under <strong>For employers</strong> and publish listings from the Fusion dashboard.
        </p>
        <p>
          Exploring a career track with us? See{" "}
          <Link
            href="/careers/jobs/marketing-opportunities"
            className="font-semibold text-primary-600 underline hover:text-primary-700"
          >
            marketing
          </Link>
          ,{" "}
          <Link
            href="/careers/jobs/fashion-opportunities"
            className="font-semibold text-primary-600 underline hover:text-primary-700"
          >
            fashion
          </Link>
          ,{" "}
          <Link
            href="/careers/jobs/events-opportunities"
            className="font-semibold text-primary-600 underline hover:text-primary-700"
          >
            events
          </Link>
          , and{" "}
          <Link
            href="/careers/jobs/education-opportunities"
            className="font-semibold text-primary-600 underline hover:text-primary-700"
          >
            education
          </Link>{" "}
          opportunities, or read hiring tips on our{" "}
          <Link href="/blogs" className="font-semibold text-primary-600 underline hover:text-primary-700">
            blog
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
