import type { SupabaseClient } from "@supabase/supabase-js";
import { matchJobOpening } from "@/lib/job-openings";
import { sendInterviewInviteEmail } from "@/lib/send-interview-invite-email";

export async function processInterviewInvite(
  admin: SupabaseClient,
  applicationId: string,
  options: { interviewDate?: string; interviewTime?: string } = {}
): Promise<
  { success: true; application: Record<string, unknown> } | { success: false; error: string; httpStatus: number }
> {
  const { data: app, error } = await admin
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !app) {
    return { success: false, error: "Application not found", httpStatus: 404 };
  }

  const row = app as Record<string, unknown>;
  const status = String(row.status ?? "");

  if (status === "interview_invited") {
    return {
      success: false,
      error: "Interview invitation was already sent for this application.",
      httpStatus: 400,
    };
  }
  if (status === "rejected" || status === "no_open_role") {
    return {
      success: false,
      error: "This application cannot receive an interview invite in its current status.",
      httpStatus: 400,
    };
  }

  const jobTitle = String(row.job_position ?? "").trim();
  const jobMatch = matchJobOpening(jobTitle);
  if (!jobMatch.matched) {
    return {
      success: false,
      error:
        "Job title does not match a listed opening. Add aliases in lib/job-openings.ts or ask the applicant to re-apply with a matching title.",
      httpStatus: 400,
    };
  }

  const email = String(row.email ?? "").trim();
  if (!email.includes("@")) {
    return { success: false, error: "Applicant has no valid email on file.", httpStatus: 400 };
  }

  const personal = row.personal_details as Record<string, unknown> | null | undefined;
  const firstFromDetails = personal && typeof personal.firstName === "string" ? personal.firstName : "";
  const fullName = String(row.name ?? row.full_name ?? "").trim();
  const firstName =
    firstFromDetails.trim() || (fullName ? fullName.split(/\s+/)[0] : "") || "there";

  const cmfId = String(row.cmf_agency_id ?? "");

  const sendResult = await sendInterviewInviteEmail({
    to: email,
    firstName,
    cmfAgencyId: cmfId,
    jobTitle,
    opening: jobMatch.opening,
    interviewDate: options.interviewDate,
    interviewTime: options.interviewTime,
  });

  if (!sendResult.ok) {
    return { success: false, error: sendResult.error, httpStatus: 502 };
  }

  const { data: updated, error: upErr } = await admin
    .from("applications")
    .update({ status: "interview_invited" })
    .eq("id", applicationId)
    .select()
    .single();

  if (upErr || !updated) {
    return {
      success: false,
      error: upErr?.message ?? "Failed to update application status after sending email.",
      httpStatus: 500,
    };
  }

  return { success: true, application: updated as Record<string, unknown> };
}
