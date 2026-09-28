export const KCM_FORUM_MEMBER_FEE_KES = 200;
export const KCM_FORUM_NON_MEMBER_FEE_KES = 300;
export const KCM_FORUM_CAPACITY = 100;
export const KCM_FORUM_EVENT_ISO = "2026-11-28T14:00:00+03:00";
export const KCM_FORUM_EVENT_LABEL = "Saturday, 28 November 2026";
export const KCM_FORUM_TIME_LABEL = "From 2:00 p.m.";
export const KCM_FORUM_VENUE = "IoME001, Mombasa";

export type ForumAttendeeType = "model" | "designer" | "guest";
export type ForumModelLevel = "emerging" | "professional";

export function forumFeeKes(isMember: boolean): number {
  return isMember ? KCM_FORUM_MEMBER_FEE_KES : KCM_FORUM_NON_MEMBER_FEE_KES;
}

export function formatForumFeeKes(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}
