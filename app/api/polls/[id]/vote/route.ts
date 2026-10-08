import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  pollBallotCookieName,
  pollVoteCookieOptions,
  pollVoterCookieName,
  readPollBallots,
  voterKeyFromCookie,
  writePollBallots,
} from "@/lib/fusion-poll-ballot";
import { castFusionPollVote, getFusionPoll } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { optionId?: unknown } | null;
  const optionId = typeof body?.optionId === "string" ? body.optionId : "";
  const jar = await cookies();
  const voterKey = voterKeyFromCookie(jar.get(pollVoterCookieName())?.value);
  const ballots = readPollBallots(jar.get(pollBallotCookieName())?.value);
  const previous = ballots.get(id);

  if (previous) {
    const record = await getFusionPoll(id);
    if (!record) return NextResponse.json({ error: "This poll is not available." }, { status: 404 });
    return NextResponse.json({
      already: true,
      optionId: previous,
      poll: record.poll,
      options: record.options,
    });
  }

  const result = await castFusionPollVote(id, optionId, voterKey);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  ballots.set(id, result.optionId ?? optionId);
  const response = NextResponse.json({
    already: result.already,
    optionId: result.optionId,
    poll: result.record.poll,
    options: result.record.options,
  });
  response.cookies.set(pollVoterCookieName(), voterKey, pollVoteCookieOptions);
  response.cookies.set(pollBallotCookieName(), writePollBallots(ballots), pollVoteCookieOptions);
  return response;
}
