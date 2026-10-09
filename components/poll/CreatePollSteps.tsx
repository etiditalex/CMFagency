const STEPS = [
  {
    title: "Fill out the form",
    body: "Choose a title, add the answer options, and set how the poll should run for your audience, brand, or event.",
  },
  {
    title: "Invite participants",
    body: "Share the poll link so a room, a campaign, or the public can vote as soon as the poll is live.",
  },
  {
    title: "Get instant results",
    body: "As soon as a vote is cast, the totals update on the public results page while the poll is still open.",
  },
] as const;

export default function CreatePollSteps() {
  return (
    <section className="poll-create-steps mx-auto max-w-5xl pb-20 pt-6 sm:pt-10" aria-labelledby="poll-create-steps-heading">
      <p className="poll-create-kicker">Getting started</p>
      <h2 id="poll-create-steps-heading" className="poll-create-steps-title mx-auto mt-3 max-w-3xl">
        How to create a poll in three simple steps
      </h2>
      <p className="poll-create-steps-lead mx-auto mt-4 max-w-2xl">
        The poll maker stays simple to use. Ask who should take the runway, which brand should lead, or what an audience thinks, then publish the poll and follow the votes.
      </p>
      <ol className="mt-12 grid gap-10 sm:mt-14 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span className="poll-create-step-num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-600 text-white">
              {index + 1}.
            </span>
            <div className="min-w-0">
              <h3>{step.title}</h3>
              <p className="mt-2 text-white/70">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
