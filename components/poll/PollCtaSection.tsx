import Link from "next/link";

export default function PollCtaSection() {
  return (
    <section className="poll-cta bg-primary-900" aria-labelledby="poll-cta-heading">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:px-14 lg:py-14">
        <h2 id="poll-cta-heading" className="font-montserrat text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          <span className="block">Ready to get started?</span>
          <span className="block text-primary-200">It&apos;s free!</span>
        </h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/contact?service=poll"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-100 px-5 py-2.5 text-[15px] font-semibold text-primary-950 transition-colors hover:bg-white sm:w-auto"
          >
            Create a poll
          </Link>
          <Link
            href="/poll/signup"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary-600 px-5 py-2.5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-500 sm:w-auto"
          >
            Sign up
          </Link>
        </div>
      </div>
    </section>
  );
}
