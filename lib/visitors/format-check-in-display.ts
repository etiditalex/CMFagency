/** Format ISO timestamp for confirmation screen (e.g. "5:44 PM"). */
export function formatCheckInClock(iso: string | null | undefined, timeZone = "Africa/Nairobi") {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-KE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  });
}

/** Format ISO timestamp for email (e.g. "May 16, 2026 11:24:49 PM EAT"). */
export function formatCheckInEmailDateTime(iso: string | null | undefined, timeZone = "Africa/Nairobi") {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  });
}

export function formatCheckInDateLabel(iso: string | null | undefined, timeZone = "Africa/Nairobi") {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  });
}
