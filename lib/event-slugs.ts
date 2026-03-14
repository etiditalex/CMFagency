/**
 * Maps legacy integer event IDs to slug-based URLs to avoid enumerable IDs.
 * Use these slugs in links instead of /events/11, /events/12, etc.
 */
export const EVENT_ID_TO_SLUG: Record<number, { slug: string; status: "upcoming" | "past" }> = {
  1: { slug: "mr-and-ms-deaf-kenya", status: "past" },
  2: { slug: "the-coast-fashion-and-modeling-awards", status: "past" },
  3: { slug: "mr-and-miss-mombasa-international-show", status: "past" },
  4: { slug: "mr-and-miss-mbita", status: "past" },
  5: { slug: "mr-and-miss-fashion-mbita", status: "past" },
  6: { slug: "mr-and-miss-culture-subaland", status: "upcoming" },
  7: { slug: "marketing-society-of-kenya-workshop", status: "past" },
  8: { slug: "marketing-society-networking-mixer", status: "upcoming" },
  9: { slug: "brand-activation-event-marketing-society", status: "past" },
  10: { slug: "king-experience-live-concert", status: "past" },
  11: { slug: "marketing-campaign-launch", status: "upcoming" },
  12: { slug: "corporate-sponsorship-launch", status: "past" },
  13: { slug: "joint-promotional-launch", status: "upcoming" },
  14: { slug: "stakeholder-engagement-forum", status: "past" },
  15: { slug: "leadership-development-seminar", status: "upcoming" },
  16: { slug: "professional-development-panel-discussion", status: "past" },
  17: { slug: "skill-building-workshop-series", status: "upcoming" },
  18: { slug: "student-leadership-forum", status: "past" },
  19: { slug: "campus-town-hall-meeting", status: "upcoming" },
  20: { slug: "student-feedback-forum", status: "past" },
  21: { slug: "student-engagement-drive", status: "upcoming" },
};

export function getEventPathById(id: number): string | null {
  const entry = EVENT_ID_TO_SLUG[id];
  if (!entry) return null;
  return entry.status === "upcoming"
    ? `/events/upcoming/${entry.slug}`
    : `/events/past/${entry.slug}`;
}

const SLUG_TO_ID = Object.fromEntries(
  (Object.entries(EVENT_ID_TO_SLUG) as [string, { slug: string }][]).map(([id, { slug }]) => [slug, id])
);

export function getEventIdBySlug(slug: string): number | null {
  const id = SLUG_TO_ID[slug];
  return id != null ? Number(id) : null;
}
