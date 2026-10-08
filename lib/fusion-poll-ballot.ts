const VOTER_COOKIE = "cf_poll_voter";
const BALLOT_COOKIE = "cf_poll_ballots";

export const pollVoteCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};

export function pollVoterCookieName() {
  return VOTER_COOKIE;
}

export function pollBallotCookieName() {
  return BALLOT_COOKIE;
}

export function readPollBallots(raw: string | undefined) {
  const ballots = new Map<string, string>();
  if (!raw) return ballots;
  for (const part of raw.split(",")) {
    const dot = part.indexOf(".");
    if (dot <= 0) continue;
    const pollId = part.slice(0, dot);
    const optionId = part.slice(dot + 1);
    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pollId) && optionId) ballots.set(pollId, optionId);
  }
  return ballots;
}

export function writePollBallots(ballots: Map<string, string>) {
  return [...ballots.entries()]
    .slice(-40)
    .map(([pollId, optionId]) => `${pollId}.${optionId}`)
    .join(",");
}

export function voterKeyFromCookie(raw: string | undefined) {
  if (raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return raw;
  return crypto.randomUUID();
}
