import Link from "next/link";

export default function FashionShowTickets() {
  return (
    <section className="fashion-night-past" aria-labelledby="fashion-show-tickets-heading">
      <h2 id="fashion-show-tickets-heading">This is a past event</h2>
      <p>Changer Fusions has other events you may be interested in.</p>
      <Link href="/events" className="fn-past-more">
        View more events
      </Link>
      <span className="fn-past-rule" aria-hidden />
    </section>
  );
}
