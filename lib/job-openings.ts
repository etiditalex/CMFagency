/**
 * Canonical open roles at CMF Agency. Edit this list as hiring changes.
 * Matching is case-insensitive; aliases help applicants who type variations.
 * Each role maps to the office where interviews are held.
 */
export type JobOpening = {
  id: string;
  /** Primary and alternate titles applicants may enter */
  titles: string[];
  officeName: string;
  officeAddress: string;
  /** Shown in interview invite email (directions, floor, etc.) */
  interviewLocationNotes: string;
  /** Optional contact line for the interview */
  contactLine?: string;
};

export const JOB_OPENINGS: JobOpening[] = [
  {
    id: "it-support",
    titles: ["IT Support", "IT SUPPORT", "Information Technology Support", "Tech Support", "IT Technician"],
    officeName: "CMF Agency — Nairobi HQ",
    officeAddress: "Nairobi, Kenya (exact address supplied in your invite)",
    interviewLocationNotes:
      "Report to the reception at Nairobi HQ on the date below. Bring a printed copy of this email and original ID.",
    contactLine: "HR: +254 700 000 000 (placeholder — update in lib/job-openings.ts)",
  },
  {
    id: "marketing",
    titles: ["Marketing Manager", "Marketing", "Digital Marketing", "Brand Marketing", "Social Media Manager"],
    officeName: "CMF Agency — Mombasa Office",
    officeAddress: "Mombasa, Kenya (exact address supplied in your invite)",
    interviewLocationNotes:
      "Interviews for marketing roles are held at the Mombasa office. Arrive 15 minutes early with your CV.",
    contactLine: "Talent: +254 700 000 001 (placeholder — update in lib/job-openings.ts)",
  },
  {
    id: "event-coordinator",
    titles: ["Event Coordinator", "Events Coordinator", "Event Manager", "Events Manager"],
    officeName: "CMF Agency — Mombasa Office",
    officeAddress: "Mombasa, Kenya (exact address supplied in your invite)",
    interviewLocationNotes: "Events team interviews take place at the Mombasa office.",
    contactLine: "Events desk: +254 700 000 002 (placeholder — update in lib/job-openings.ts)",
  },
  {
    id: "fashion-model-scout",
    titles: ["Fashion Scout", "Model Scout", "Talent Scout", "Casting Coordinator"],
    officeName: "CMF Agency — Coast Fashion Hub",
    officeAddress: "Coast region — details in invite",
    interviewLocationNotes: "Fashion and modelling interviews are scheduled at our Coast Fashion Hub.",
  },
];

export function normalizeJobTitle(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Match applicant free-text to a listed opening (exact or strong substring, min 4 chars).
 */
export function matchJobOpening(appliedTitle: string): { matched: true; opening: JobOpening } | { matched: false } {
  const n = normalizeJobTitle(appliedTitle);
  if (n.length < 2) return { matched: false };

  for (const opening of JOB_OPENINGS) {
    for (const title of opening.titles) {
      const nt = normalizeJobTitle(title);
      if (!nt) continue;
      if (n === nt) return { matched: true, opening };
      if (n.length >= 4 && nt.length >= 4 && (n.includes(nt) || nt.includes(n))) {
        return { matched: true, opening };
      }
    }
  }
  return { matched: false };
}

export function getJobOpeningById(id: string): JobOpening | undefined {
  return JOB_OPENINGS.find((o) => o.id === id);
}

/** Suggestions for the application form &lt;datalist&gt; */
export function officialJobTitleSuggestions(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of JOB_OPENINGS) {
    for (const t of o.titles) {
      const k = normalizeJobTitle(t);
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(t);
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}
