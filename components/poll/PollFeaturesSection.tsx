import { Clock, Code2, FlaskConical, Radio, Shield, Smile } from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Fake Detection",
    description: "Duplicate votes and automated responses are blocked, so a poll reflects real people.",
  },
  {
    icon: Clock,
    title: "Deadlines",
    description: "Polls can stay open, or close when a runway vote or opinion poll reaches its deadline.",
  },
  {
    icon: Smile,
    title: "Emoji Support",
    description: "Use emojis in questions and answers for events, launches, and audience polls.",
  },
  {
    icon: Radio,
    title: "Live Results",
    description: "Watch votes update in a pie chart or bar graph while the poll is still open.",
  },
  {
    icon: Code2,
    title: "Poll API",
    description: "Connect poll creation and results to your own event, campaign, or audience tools.",
  },
  {
    icon: FlaskConical,
    title: "Active Development",
    description: "We keep adding features for polls and opinion polls, from setup through live results.",
  },
] as const;

export default function PollFeaturesSection() {
  return (
    <section className="poll-features bg-primary-950 px-4 py-14 sm:px-10 sm:py-20 lg:px-14 lg:py-24" aria-labelledby="poll-features-heading">
      <div className="mx-auto max-w-6xl">
        <p className="poll-features-kicker text-center text-xs font-bold uppercase tracking-[0.22em] text-primary-300">
          Polling made easy
        </p>
        <h2
          id="poll-features-heading"
          className="mx-auto mt-4 max-w-3xl text-center font-montserrat text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-[2.65rem]"
        >
          Simple polls with powerful configuration
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[15px] leading-relaxed text-white/70 sm:text-base">
          Polls stay simple to launch, with configuration for deadlines, live results, and opinion polls
          across events, brands, and audiences.
        </p>

        <div className="mt-14 grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-x-6">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="relative rounded-xl border border-primary-800 bg-primary-900 px-4 pb-7 pt-10 text-center sm:px-6"
            >
              <div className="absolute left-1/2 top-0 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-primary-600 text-white shadow-sm">
                <feature.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="font-montserrat text-base font-bold text-white">{feature.title}</h3>
              <p className="poll-features-copy mx-auto mt-2 max-w-[16rem] text-[13px] leading-relaxed text-white/65">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
