import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import CreatedPollCard from "@/components/poll/CreatedPollCard";
import PollJsonLd from "@/components/poll/PollJsonLd";
import { pollBallotCookieName, readPollBallots } from "@/lib/fusion-poll-ballot";
import { getFusionPoll } from "@/lib/fusion-polls-server";
import { pollResultJsonLd } from "@/lib/poll/poll-jsonld";
import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getFusionPoll(id);
  if (!record || record.poll.topic !== "poll") {
    return { title: "Poll", robots: { index: false, follow: false } };
  }
  return pollPageMetadata({
    title: record.question,
    description: `${record.question} Vote on this Changer Fusions poll and see the tally update.`,
    path: `/poll/${id}`,
    keywords: [record.poll.title, "Changer Fusions poll", "live poll"],
  });
}

export default async function CreatedPollPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { view } = await searchParams;
  const record = await getFusionPoll(id);
  if (!record) notFound();
  if (record.poll.topic !== "poll") redirect(`/poll/live/${id}`);

  const jar = await cookies();
  const votedOptionId = readPollBallots(jar.get(pollBallotCookieName())?.value).get(id) ?? null;
  const options = record.options
    .filter((option) => option.id)
    .map((option) => ({ id: option.id as string, name: option.name, votes: option.votes }));

  return (
    <main className="poll-live-demo overflow-x-clip bg-primary-950 px-4 pb-20 pt-[var(--site-nav-height)] sm:px-6">
      <PollJsonLd
        data={pollResultJsonLd({
          id,
          title: record.question,
          question: record.question,
          topicLabel: record.poll.topicLabel,
          options: options.map((option) => ({ name: option.name, votes: option.votes })),
          feature: "poll",
        })}
      />
      <div className="flex min-h-[calc(100vh-var(--site-nav-height))] flex-col items-center justify-center py-12">
        <CreatedPollCard
          pollId={id}
          question={record.question}
          status={record.poll.status}
          options={options}
          votedOptionId={votedOptionId}
          openResults={view === "results"}
        />
      </div>
    </main>
  );
}
