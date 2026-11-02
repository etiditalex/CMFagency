import { NextRequest, NextResponse } from "next/server";

import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { isVolunteerStatus } from "@/lib/kfcaa-volunteers";

export const runtime = "nodejs";

const SETUP_MESSAGE =
  "Volunteer applications are not set up yet. Run database/ticketing_voting_mvp_patch_103_kfcaa_volunteer_applications.sql in the Supabase SQL editor.";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textOrNull(value: unknown): string | null {
  const next = text(value).trim();
  return next ? next : null;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed.map((item) => text(item).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);
  }
  return [trimmed];
}

function missingTable(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return error.code === "42P01" || message.includes("does not exist") || message.includes("schema cache");
}

function mapApplication(row: Record<string, unknown>) {
  const status = text(row.status);
  return {
    id: text(row.id),
    applicationCode: text(row.application_code),
    fullName: text(row.full_name),
    phone: text(row.phone),
    whatsapp: text(row.whatsapp),
    email: text(row.email),
    town: text(row.town),
    residenceCounty: text(row.residence_county),
    currentRole: textOrNull(row.present_role ?? row.current_role),
    role: text(row.role) === "regional" ? "regional" : "county",
    region: textOrNull(row.region),
    representCounty: textOrNull(row.represent_county),
    creativeAreas: stringList(row.creative_areas),
    whyApply: text(row.why_apply),
    communityExperience: text(row.community_experience),
    howPromote: text(row.how_promote),
    accuracyConfirmed: row.accuracy_confirmed === true,
    volunteerAcknowledged: row.volunteer_acknowledged === true,
    contactAgreed: row.contact_agreed === true,
    updatesCommitted: row.updates_committed === true,
    status: isVolunteerStatus(status) ? status : "new",
    createdAt: text(row.created_at),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrManager(req);
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.admin
    .from("kfcaa_volunteer_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("kfcaa volunteer list:", error.message);
    return NextResponse.json({ error: missingTable(error) ? SETUP_MESSAGE : "Could not load volunteer applications." }, { status: 500 });
  }

  return NextResponse.json({
    applications: ((data as Record<string, unknown>[]) ?? []).map(mapApplication),
  });
}
