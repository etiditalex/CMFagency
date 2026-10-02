import Link from "next/link";

/**
 * Original, crawlable copy for /jobs so the job board is not only syndicated listings.
 * Page H1 lives in JobsHero; this block continues with supporting guidance.
 */
export function JobsEditorialIntro() {
  return (
    <article className="rounded-2xl border border-gray-200/80 bg-white/95 p-6 shadow-sm md:p-8">
      <h2 className="text-left text-xl font-bold text-gray-900 md:text-2xl">
        How to use the board
      </h2>
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
          Marketing, fashion, events, and education roles sit on this{" "}
          <Link href="/jobs" className="font-semibold text-primary-600 underline hover:text-primary-700">
            job board
          </Link>
          . For a longer path with Changer Fusions, read{" "}
          <Link href="/careers" className="font-semibold text-primary-600 underline hover:text-primary-700">
            career development
          </Link>
          , or hiring tips on our{" "}
          <Link href="/blogs" className="font-semibold text-primary-600 underline hover:text-primary-700">
            blog
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
