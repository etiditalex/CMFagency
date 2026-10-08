import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LivePollResults from "@/components/poll/LivePollResults";
import { ballotFor, getSamplePoll, pollResultsTitle } from "@/components/poll/live-polls-sample";
import { STARTER_COMMENTS } from "@/lib/fusion-polls";
import { getFusionPoll } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getFusionPoll(id);
  if (record) {
    return {
      title: pollResultsTitle(record.poll),
      description: record.question,
    };
  }
  const poll = getSamplePoll(id);
  if (!poll) return { title: "Poll results" };
  return {
    title: ballotFor(poll).title,
    description: ballotFor(poll).question,
  };
}

export default async function PollResultsPage({ params }: Props) {
  const { id } = await params;
  const record = await getFusionPoll(id);
  if (record) {
    return (
      <div className="min-h-screen bg-white">
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
    <div className="min-h-screen bg-white">
      <LivePollResults poll={poll} ballot={ballot} comments={STARTER_COMMENTS} persisted={false} />
    </div>
  );
}
