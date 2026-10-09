import Link from "next/link";

const EXAMPLES = [
  {
    title: "Runway lineup",
    body: "Ask the room which brand should open the next runway.",
  },
  {
    title: "Session choice",
    body: "Let an audience pick the next session while the event is still live.",
  },
  {
    title: "Brand read",
    body: "A campaign team asks which look should lead the launch.",
  },
  {
    title: "Public decision",
    body: "A forum or a room needs a visible tally before the night moves on.",
  },
] as const;

export default function LiveDemoExamples() {
  return (
    <>
    <section className="poll-live-demo-examples mx-auto w-full max-w-[52rem] pb-8 pt-4 sm:pt-8" aria-labelledby="anonymous-polls-heading">
      <h2 id="anonymous-polls-heading" className="poll-live-demo-section-title">
        Anonymous Polls
      </h2>
      <p className="poll-live-demo-section-copy mt-3 max-w-3xl">
        A Changer Fusions poll lets an audience, a room, or the public vote without an account. Each browser can vote once, and the tally stays on the public results page while the poll is open and after it closes.
      </p>
      <h3 className="poll-live-demo-examples-title">Examples</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {EXAMPLES.map((example) => (
          <li key={example.title} className="poll-live-demo-example">
            <h4>{example.title}</h4>
            <p>{example.body}</p>
          </li>
        ))}
      </ul>
    </section>
    <section className="poll-live-demo-examples mx-auto mt-14 w-full max-w-[52rem] pb-4 sm:mt-20" aria-labelledby="group-polls-heading">
      <h2 id="group-polls-heading" className="poll-live-demo-section-title">
        Group Polls
      </h2>
      <p className="poll-live-demo-section-copy mt-3 max-w-3xl">
        A group poll is for a styling team, a campaign room, or a larger audience when each choice should stay in one tally. Share the link and people can vote without an account. The public results page updates as those votes come in.
      </p>
      <h3 className="poll-live-demo-examples-title">Examples</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        <li className="poll-live-demo-example">
          <h4>Small room</h4>
          <p>A styling team votes on which look opens the runway.</p>
        </li>
        <li className="poll-live-demo-example">
          <h4>Large audience</h4>
          <p>A live event asks the room which session should run next.</p>
        </li>
      </ul>
      <Link href="/poll" className="poll-live-demo-more">
        Learn more about group polls →
      </Link>
    </section>
    <section className="poll-live-demo-examples poll-live-demo-split mx-auto mt-14 w-full max-w-[52rem] pb-4 sm:mt-16" aria-labelledby="meeting-polls-heading">
      <h2 id="meeting-polls-heading" className="poll-live-demo-section-title">
        Meeting Polls
      </h2>
      <p className="poll-live-demo-section-copy mt-3 max-w-3xl">
        A meeting poll is a group poll whose answers are dates or session times. Use it when a room, a brand team, or a campaign needs one time, and the tally stays on the public results page.
      </p>
      <h3 className="poll-live-demo-examples-title">Examples</h3>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        <li className="poll-live-demo-example">
          <h4>Session time</h4>
          <p>Ask the room which slot should open the next runway.</p>
        </li>
        <li className="poll-live-demo-example">
          <h4>Launch evening</h4>
          <p>A campaign team votes on which night the launch should land.</p>
        </li>
      </ul>
      <Link href="/poll/create" className="poll-live-demo-more">
        Learn more about meeting polls →
      </Link>
    </section>
  </>
  );
}
