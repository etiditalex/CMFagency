import type { CheckInSession } from "@/components/fusion-xpress/visitor-management/VisitorCheckInConfirmation";
import {
  formatCheckInClock,
  formatCheckInDateLabel,
} from "@/lib/visitors/format-check-in-display";
import { mapIndustryFormToVisitor } from "@/lib/visitors/industry-form-mapper";
import type { IndustryDemo } from "@/lib/visitors/industry-demos";

function pickVisitorName(values: Record<string, string | string[]>): string {
  const v = values.fullName ?? values.full_name;
  const name = typeof v === "string" ? v.trim() : "";
  return name || "Guest";
}

/** Build confirmation-screen data from form values (preview or fallback). */
export function buildCheckInSessionFromForm(params: {
  industrySlug: string;
  values: Record<string, string | string[]>;
  venueName: string;
  visitorId?: string;
  checkedInAt?: string;
  emailSent?: boolean;
}): CheckInSession | { error: string } {
  const mapped = mapIndustryFormToVisitor(params.industrySlug, params.values);
  const visitorName =
    "error" in mapped ? pickVisitorName(params.values) : mapped.row.full_name;
  const checkedInAt = params.checkedInAt ?? new Date().toISOString();

  return {
    visitorId: params.visitorId ?? "",
    venueName: params.venueName.trim() || "Reception",
    visitorName,
    checkedInAt,
    timeLabel: formatCheckInClock(checkedInAt),
    dateLabel: formatCheckInDateLabel(checkedInAt),
    emailSent: params.emailSent,
  };
}

export function defaultVenueNameForDemo(demo: IndustryDemo): string {
  return demo.title.replace(/\s*Demo\s*$/i, "").trim() || "Reception";
}
