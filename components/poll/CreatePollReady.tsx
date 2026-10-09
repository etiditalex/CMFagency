import Link from "next/link";

export default function CreatePollReady() {
  return (
    <section className="poll-create-ready -mx-4 mt-16 pb-16" aria-labelledby="poll-create-ready-heading">
      <div className="bg-primary-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-12">
          <h2 id="poll-create-ready-heading" className="poll-create-ready-title">
            Ready to get started?
            <br />
            Make your first poll today.
          </h2>
          <div className="flex shrink-0 flex-wrap items-center gap-4">
            <a href="#create-poll" className="poll-create-preview-action inline-flex h-11 items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-500">
              Create your poll
            </a>
            <Link href="/poll/signup" className="inline-flex items-center text-sm font-semibold text-white hover:text-primary-200">
              Sign up →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
