import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { pollBallotCookieName, readPollBallots } from "@/lib/fusion-poll-ballot";
import { getFusionPoll } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const record = await getFusionPoll(id);
  if (!record) return NextResponse.json({ poll: null }, { status: 404 });
  const jar = await cookies();
  const votedOptionId = readPollBallots(jar.get(pollBallotCookieName())?.value).get(id) ?? null;
  return NextResponse.json({
    poll: record.poll,
    question: record.question,
    options: record.options,
    votedOptionId,
  });
}
