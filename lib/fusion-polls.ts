import type { LivePollStatus, LivePollTopic, PollOption, SamplePoll } from "@/components/poll/live-polls-sample";

export type PollComment = {
  id: string;
  name: string;
  body: string;
  at: string;
};

export const STARTER_COMMENTS: PollComment[] = [
  {
    id: "starter-amina",
    name: "Amina Hassan",
    body: "The brand vote feels closer than the runway chatter suggested. Curious how Coast audiences land once the full week is in.",
    at: "2026-10-07T18:20:00.000Z",
  },
  {
    id: "starter-james",
    name: "James Kariuki",
    body: "Useful snapshot for the civic forums. I would still like a county split before anyone treats this as the final read.",
    at: "2026-10-07T14:05:00.000Z",
  },
  {
    id: "starter-faith",
    name: "Faith Wanjiru",
    body: "Sharing this with our campaign team. The gap between the top two is small enough that the next event could move it.",
    at: "2026-10-06T09:40:00.000Z",
  },
];

export type PollOptionRow = PollOption & { id?: string; sortOrder: number };

export type FusionPollRecord = {
  poll: SamplePoll;
  question: string;
  options: PollOptionRow[];
  comments: PollComment[];
  commentCount: number;
};

type OptionDb = {
  id?: string;
  name: string;
  label: string | null;
  votes: number | null;
  sort_order: number | null;
};

type CommentDb = {
  id?: string;
  author_name?: string;
  body?: string;
  created_at?: string;
  count?: number;
};

export type PollDbRow = {
  id: string;
  title: string;
  question: string;
  topic: LivePollTopic;
  topic_label: string;
  status: LivePollStatus;
  region: string;
  county: string;
  ends_label: string;
  spoiled_votes: number | null;
  fusion_poll_options?: OptionDb[] | null;
  fusion_poll_comments?: CommentDb[] | null;
};

export const POLL_LIST_SELECT =
  "id,title,question,topic,topic_label,status,region,county,ends_label,spoiled_votes,fusion_poll_options(id,name,label,votes,sort_order),fusion_poll_comments(count)";

export const POLL_DETAIL_SELECT =
  "id,title,question,topic,topic_label,status,region,county,ends_label,spoiled_votes,fusion_poll_options(id,name,label,votes,sort_order),fusion_poll_comments(id,author_name,body,created_at)";

export function isMissingPollTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || /fusion_polls/i.test(message);
}

function commentMeta(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value) && "count" in value) {
    return { commentCount: Number((value as { count: number }).count) || 0, comments: [] as PollComment[] };
  }
  const list = Array.isArray(value) ? (value as CommentDb[]) : [];
  const counted = list.length === 1 && list[0] && typeof list[0].count === "number" && !list[0].id;
  if (counted) return { commentCount: Number(list[0].count) || 0, comments: [] as PollComment[] };
  const comments = list
    .filter((row) => row.id && row.author_name && row.body)
    .map((row) => ({
      id: String(row.id),
      name: String(row.author_name),
      body: String(row.body),
      at: String(row.created_at ?? ""),
    }))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  return { commentCount: comments.length, comments };
}

export function mapPollRow(row: PollDbRow): FusionPollRecord {
  const options = [...(row.fusion_poll_options ?? [])]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((option, index) => ({
      id: option.id,
      name: option.name,
      label: option.label ?? "",
      votes: Number(option.votes ?? 0),
      sortOrder: option.sort_order ?? index,
    }));
  const { comments, commentCount } = commentMeta(row.fusion_poll_comments);
  return {
    poll: {
      id: row.id,
      title: row.title,
      topic: row.topic,
      topicLabel: row.topic_label,
      status: row.status,
      region: row.region,
      county: row.county,
      ends: row.ends_label,
      totalVotes: options.reduce((total, option) => total + option.votes, 0),
      spoiledVotes: Number(row.spoiled_votes ?? 0),
    },
    question: row.question,
    options,
    comments,
    commentCount,
  };
}
