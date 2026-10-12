import Link from "next/link";

export default function FashionNightPast() {
  return (
    <section className="fashion-night-past" aria-labelledby="fashion-night-past-heading">
      <h2 id="fashion-night-past-heading">This is a past event</h2>
      <p>Changer Fusions has other events you may be interested in.</p>
      <Link href="/events" className="fn-past-more">
        View more events
      </Link>
      <span className="fn-past-rule" aria-hidden />
    </section>
  );
}
