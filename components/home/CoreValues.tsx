const coreValues = [
  {
    title: "Innovation",
    description:
      "We embrace creativity, emerging trends, and modern technologies to deliver forward-thinking marketing strategies and memorable event experiences.",
  },
  {
    title: "Integrity",
    description:
      "We operate with honesty, transparency, and accountability in every engagement, building trust with our clients, partners, and stakeholders.",
  },
  {
    title: "Excellence",
    description:
      "We are committed to the highest standards of quality, professionalism, and execution in both marketing solutions and event delivery.",
  },
  {
    title: "Client-Centricity",
    description:
      "Our clients' goals are at the center of everything we do. We listen, collaborate, and tailor solutions that deliver real value and measurable impact.",
  },
  {
    title: "Impact & Results",
    description:
      "We focus on outcomes, not just activity. Our success is measured by growth, visibility, engagement, and lasting impact for our clients.",
  },
];

export default function CoreValues() {
  return (
    <section className="home-core-values home-band home-band-paper home-arch" aria-labelledby="home-core-values-heading">
      <div className="home-shell">
        <h2 id="home-core-values-heading" className="home-display text-primary-950">
          Core values
        </h2>
        <ul className="mt-8">
          {coreValues.map((value) => (
            <li key={value.title} className="grid gap-2 border-t border-primary-950/15 py-6 last:border-b sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-baseline sm:gap-10">
              <h3 className="font-montserrat text-2xl font-medium tracking-tight text-primary-950">{value.title}</h3>
              <p className="text-base leading-relaxed text-primary-900/80">{value.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
