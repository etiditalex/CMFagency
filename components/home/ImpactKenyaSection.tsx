import KenyaPresenceMap from "@/components/home/KenyaPresenceMap";
import AnimatedCount from "@/components/home/AnimatedCount";

const STATS = [
  { value: 17000, suffix: "+", label: "People reached" },
  { value: 3, suffix: "", label: "Events & campaigns" },
  { value: 20, suffix: "", label: "Partnerships" },
  { value: 25, suffix: "", label: "Volunteer staff" },
] as const;

export default function ImpactKenyaSection() {
  return (
    <section
      className="home-impact w-full bg-primary-50 py-8 sm:py-14 md:py-16 lg:py-20"
      aria-labelledby="home-impact-heading"
    >
      <div className="mx-auto grid w-full max-w-[90rem] items-center gap-5 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8">
        <div>
          <p className="home-impact-eyebrow mb-2 flex items-center gap-3 font-montserrat text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary-700 sm:mb-3 sm:text-sm">
            <span className="inline-block h-px w-10 bg-primary-700 sm:w-14" aria-hidden />
            In Kenya
          </p>
          <h2
            id="home-impact-heading"
            className="mb-4 font-montserrat text-[1.75rem] font-bold text-primary-950 sm:mb-10 sm:text-5xl md:text-6xl"
          >
            Where We Work
          </h2>
          <KenyaPresenceMap />
        </div>

        <div className="grid grid-cols-2">
          {STATS.map((stat, index) => {
            const isRight = index % 2 === 1;
            const isBottom = index > 1;
            return (
              <div
                key={stat.label}
                className={`home-impact-stat flex flex-col items-center justify-center px-2 py-4 text-center sm:px-6 sm:py-10 md:py-12 ${
                  isRight ? "border-l border-secondary-600/40" : ""
                } ${isBottom ? "border-t border-secondary-600/40" : ""}`}
              >
                <p className="font-montserrat text-[1.45rem] font-bold tabular-nums text-secondary-700 sm:text-4xl md:text-5xl">
                  <AnimatedCount
                    value={stat.value}
                    suffix={stat.suffix}
                    durationMs={1600 + index * 180}
                  />
                </p>
                <p className="mt-1 text-xs text-primary-800/80 sm:mt-2 sm:text-base">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
