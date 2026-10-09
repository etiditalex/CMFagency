import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import LivePollResults from "@/components/poll/LivePollResults";
import PollJsonLd from "@/components/poll/PollJsonLd";
import { ballotFor, getSamplePoll, pollResultsTitle } from "@/components/poll/live-polls-sample";
import { STARTER_COMMENTS } from "@/lib/fusion-polls";
import { getFusionPoll } from "@/lib/fusion-polls-server";
import { pollResultJsonLd } from "@/lib/poll/poll-jsonld";
import { pollPageMetadata } from "@/lib/poll/poll-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getFusionPoll(id);
  if (record?.poll.topic === "poll") {
    return { title: record.question, robots: { index: false, follow: false } };
  }
  if (record) {
    const description = `${record.question} ${record.poll.topicLabel} poll. ${record.poll.totalVotes.toLocaleString("en-KE")} votes recorded.`;
    return pollPageMetadata({
      title: pollResultsTitle(record.poll),
      description,
      path: `/poll/live/${id}`,
      keywords: [record.poll.title, record.poll.topicLabel, "live poll results", "Changer Fusions", "opinion poll"],
    });
  }
  const poll = getSamplePoll(id);
  if (!poll) return { title: "Poll results", robots: { index: false, follow: false } };
  return {
    ...pollPageMetadata({
      title: ballotFor(poll).title,
      description: ballotFor(poll).question,
      path: `/poll/live/${id}`,
      keywords: [],
      index: false,
    }),
  };
}

export default async function PollResultsPage({ params }: Props) {
  const { id } = await params;
  const record = await getFusionPoll(id);
  if (record?.poll.topic === "poll") redirect(`/poll/${id}`);
  if (record) {
    return (
      <div className="min-h-screen overflow-x-clip bg-white">
        <PollJsonLd
          data={pollResultJsonLd({
            id,
            title: pollResultsTitle(record.poll),
            question: record.question,
            topicLabel: record.poll.topicLabel,
            options: record.options.map((option) => ({ name: option.name, votes: option.votes })),
          })}
        />
        <LivePollResults
          poll={record.poll}
          ballot={{
            title: pollResultsTitle(record.poll),
            question: record.question,
            options: record.options,
          }}
          comments={record.comments}
          persisted
        />
      </div>
    );
  }

  const poll = getSamplePoll(id);
  if (!poll) notFound();
  const ballot = ballotFor(poll);

  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <LivePollResults poll={poll} ballot={ballot} comments={STARTER_COMMENTS} persisted={false} />
    </div>
  );
}
