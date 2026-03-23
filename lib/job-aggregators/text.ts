import type { CollectedJob } from "./types";

export function stripHtml(html: string, maxLen?: number): string {
  const t = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLen != null && t.length > maxLen) return `${t.slice(0, maxLen - 1)}…`;
  return t;
}

export function mapLooseJobType(raw: string | null | undefined): CollectedJob["employment_type"] {
  const s = String(raw ?? "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s.includes("part")) return "part_time";
  if (s.includes("contract") || s.includes("freelance")) return "contract";
  if (s.includes("intern")) return "internship";
  if (s.includes("attachment")) return "attachment";
  return "full_time";
}
