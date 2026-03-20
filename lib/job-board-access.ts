/** Employment types visible without annual job-board membership */
export const JOB_BOARD_FREE_EMPLOYMENT_TYPES = ["internship", "attachment"] as const;

export function listingRequiresPaidMembership(employmentType: string): boolean {
  const t = String(employmentType || "").toLowerCase().trim();
  return !JOB_BOARD_FREE_EMPLOYMENT_TYPES.includes(t as (typeof JOB_BOARD_FREE_EMPLOYMENT_TYPES)[number]);
}

export const JOB_BOARD_MEMBERSHIP_SLUG = "job-board-membership";

export function formatEmploymentType(t: string): string {
  const m: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
    attachment: "Industrial attachment",
  };
  return m[t] ?? t;
}
