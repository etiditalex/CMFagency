export type LivePollTopic =
  | "brand"
  | "politics"
  | "presidential"
  | "gubernatorial"
  | "senatorial"
  | "events"
  | "opinion"
  | "campaign"
  | "poll";

export type LivePollStatus = "Live" | "Ended" | "Scheduled";

export type SamplePoll = {
  id: string;
  title: string;
  topic: LivePollTopic;
  topicLabel: string;
  status: LivePollStatus;
  region: string;
  county: string;
  ends: string;
  totalVotes: number;
  spoiledVotes: number;
};

const senatorial = (
  id: string,
  county: string,
  region: string,
  ends: string,
  totalVotes: number,
): SamplePoll => ({
  id,
  title: `${county} County Senatorial Poll (Sample)`,
  topic: "senatorial",
  topicLabel: "Senatorial",
  status: "Ended",
  region,
  county,
  ends,
  totalVotes,
  spoiledVotes: 0,
});

const OPTION_POOLS: Record<LivePollTopic, { names: string[]; label: string; question: (poll: SamplePoll) => string }> = {
  senatorial: {
    label: "No party",
    question: () => "If elections were held today, which candidate are you likely to vote for as your Senator?",
    names: ["Amina Kariuki", "David Otieno", "Grace Wanjiku", "Peter Kamau", "Faith Chebet", "Brian Omondi", "Lucy Njeri", "Samuel Kiptoo"],
  },
  presidential: {
    label: "No party",
    question: () => "If elections were held today, which candidate are you likely to vote for as President?",
    names: ["James Mwangi", "Halima Yusuf", "Kevin Otieno", "Ruth Wairimu", "Daniel Kiprop", "Mercy Achieng", "Isaac Mutua", "Naomi Cheruiyot"],
  },
  gubernatorial: {
    label: "No party",
    question: (poll) => `If elections were held today, which candidate are you likely to vote for as Governor of ${poll.county}?`,
    names: ["Joseph Maina", "Asha Hassan", "Eric Langat", "Catherine Wanjiru", "Paul Odhiambo", "Irene Chepkemoi", "Felix Njoroge", "Zawadi Ali"],
  },
  politics: {
    label: "Forum",
    question: () => "Which position should the next civic forum take?",
    names: ["Open the debate", "Publish the brief", "Host a town hall", "Run a follow-up poll", "Invite the brands", "Keep the floor open"],
  },
  brand: {
    label: "Brand",
    question: () => "Which brand should lead the next Changer Fusions showcase?",
    names: ["Changer Atelier", "Coast Line", "Studio North", "Runway Edit", "Fusion Label", "Night Market"],
  },
  events: {
    label: "Runway",
    question: () => "Who should take the runway at the next session?",
    names: ["Opening look", "Studio session", "Runway finale", "Guest walk", "Press call", "After party"],
  },
  opinion: {
    label: "Audience",
    question: () => "What should the next brand launch lead with?",
    names: ["The collection", "The campaign film", "A live poll", "The runway cast", "A community brief", "The studio story"],
  },
  campaign: {
    label: "Campaign",
    question: () => "Which campaign message should run this season?",
    names: ["Market to thrive", "The next runway", "Audience first", "Brand in motion", "Live results", "Coast to capital"],
  },
  poll: {
    label: "Option",
    question: (poll) => poll.title,
    names: ["First choice", "Second choice", "Third choice", "Fourth choice", "Fifth choice", "Sixth choice"],
  },
};

const VOTE_SHARES = [0.187, 0.15, 0.137, 0.13, 0.112, 0.098, 0.096, 0.09];

function rotate<T>(items: T[], seed: string) {
  const start = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

export function getSamplePoll(id: string) {
  return SAMPLE_POLLS.find((poll) => poll.id === id) ?? null;
}

export function pollResultsTitle(poll: SamplePoll) {
  if (poll.topic === "senatorial" || poll.topic === "gubernatorial" || poll.topic === "presidential") {
    const month = poll.ends.split(" ")[1] ?? "";
    const year = poll.ends.match(/\d{4}/)?.[0] ?? "";
    const office = poll.topic === "senatorial" ? "Senatorial" : poll.topic === "gubernatorial" ? "Gubernatorial" : "Presidential";
    const place = poll.topic === "presidential" ? "National" : `${poll.county} County`;
    return `${place} ${office} Poll (${month} ${year})`.replace(/\s+/g, " ").trim();
  }
  return poll.title;
}

export type PollOption = {
  name: string;
  label: string;
  votes: number;
  imageUrl?: string | null;
};

export function ballotFor(poll: SamplePoll) {
  const pool = OPTION_POOLS[poll.topic];
  const names = rotate(pool.names, poll.id).slice(0, Math.min(8, pool.names.length));
  const shares = VOTE_SHARES.slice(0, names.length);
  const shareTotal = shares.reduce((total, share) => total + share, 0);
  const votes = shares.map((share) => Math.round((share / shareTotal) * poll.totalVotes));
  const drift = poll.totalVotes - votes.reduce((total, count) => total + count, 0);
  if (votes.length > 0) votes[0] += drift;

  return {
    title: pollResultsTitle(poll),
    question: pool.question(poll),
    options: names.map((name, index) => ({
      name,
      label: pool.label,
      votes: votes[index] ?? 0,
    })),
  };
}

export const SAMPLE_POLLS: SamplePoll[] = [
  senatorial("embu", "Embu", "Eastern", "6 Oct 2026, 21:42", 4282),
  senatorial("wajir", "Wajir", "North Eastern", "1 Oct 2026, 03:53", 1681),
  senatorial("kericho", "Kericho", "Rift Valley", "26 Sept 2026, 04:14", 2487),
  senatorial("nairobi-senate", "Nairobi", "Nairobi", "4 Oct 2026, 18:10", 6120),
  senatorial("mombasa-senate", "Mombasa", "Coast", "2 Oct 2026, 20:05", 3014),
  senatorial("kisumu-senate", "Kisumu", "Nyanza", "30 Sept 2026, 16:40", 2744),
  senatorial("nakuru-senate", "Nakuru", "Rift Valley", "28 Sept 2026, 19:22", 3560),
  senatorial("kiambu-senate", "Kiambu", "Central", "27 Sept 2026, 11:15", 2890),
  senatorial("kilifi-senate", "Kilifi", "Coast", "25 Sept 2026, 09:48", 1944),
  senatorial("uasingishu-senate", "Uasin Gishu", "Rift Valley", "24 Sept 2026, 22:30", 2218),
  senatorial("kakamega-senate", "Kakamega", "Western", "22 Sept 2026, 15:05", 2675),
  senatorial("machakos-senate", "Machakos", "Eastern", "20 Sept 2026, 13:12", 2410),
  {
    id: "runway-brand",
    title: "Runway brand poll for the next studio session",
    topic: "brand",
    topicLabel: "Brand",
    status: "Ended",
    region: "Nairobi",
    county: "Nairobi",
    ends: "8 Oct 2026, 19:00",
    totalVotes: 864,
    spoiledVotes: 0,
  },
  {
    id: "coast-brand",
    title: "Coast fashion brand preference poll",
    topic: "brand",
    topicLabel: "Brand",
    status: "Ended",
    region: "Coast",
    county: "Mombasa",
    ends: "3 Oct 2026, 17:30",
    totalVotes: 542,
    spoiledVotes: 0,
  },
  {
    id: "audience-politics",
    title: "Audience politics poll for the next civic forum",
    topic: "politics",
    topicLabel: "Politics",
    status: "Ended",
    region: "Nairobi",
    county: "Nairobi",
    ends: "7 Oct 2026, 12:00",
    totalVotes: 1904,
    spoiledVotes: 0,
  },
  {
    id: "presidential-sample",
    title: "Presidential preference poll (sample)",
    topic: "presidential",
    topicLabel: "Presidential",
    status: "Ended",
    region: "Nairobi",
    county: "Nairobi",
    ends: "5 Oct 2026, 21:00",
    totalVotes: 8420,
    spoiledVotes: 0,
  },
  {
    id: "gubernatorial-mombasa",
    title: "Mombasa gubernatorial poll (sample)",
    topic: "gubernatorial",
    topicLabel: "Gubernatorial",
    status: "Ended",
    region: "Coast",
    county: "Mombasa",
    ends: "29 Sept 2026, 18:45",
    totalVotes: 4102,
    spoiledVotes: 0,
  },
  {
    id: "runway-event",
    title: "Who should take the runway next",
    topic: "events",
    topicLabel: "Events",
    status: "Ended",
    region: "Coast",
    county: "Kilifi",
    ends: "9 Oct 2026, 20:15",
    totalVotes: 736,
    spoiledVotes: 0,
  },
  {
    id: "opinion-launch",
    title: "Opinion poll on the next brand launch",
    topic: "opinion",
    topicLabel: "Opinion",
    status: "Ended",
    region: "Central",
    county: "Kiambu",
    ends: "6 Oct 2026, 14:20",
    totalVotes: 1288,
    spoiledVotes: 0,
  },
  {
    id: "campaign-sample",
    title: "Campaign message poll for the season",
    topic: "campaign",
    topicLabel: "Campaign",
    status: "Ended",
    region: "Rift Valley",
    county: "Nakuru",
    ends: "4 Oct 2026, 10:05",
    totalVotes: 990,
    spoiledVotes: 0,
  },
  {
    id: "live-brand",
    title: "Live brand poll for tonight's showcase",
    topic: "brand",
    topicLabel: "Brand",
    status: "Live",
    region: "Nairobi",
    county: "Nairobi",
    ends: "12 Oct 2026, 22:00",
    totalVotes: 318,
    spoiledVotes: 0,
  },
  {
    id: "live-senate",
    title: "Nairobi senatorial poll still open",
    topic: "senatorial",
    topicLabel: "Senatorial",
    status: "Live",
    region: "Nairobi",
    county: "Nairobi",
    ends: "12 Oct 2026, 23:59",
    totalVotes: 1540,
    spoiledVotes: 0,
  },
];
