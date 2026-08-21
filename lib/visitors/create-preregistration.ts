import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMissingPreregistrationColumns,
  isMissingVisitorsTable,
  mapVisitorRow,
  VISITOR_SELECT,
  VISITOR_SELECT_BASE,
  type VisitorRow,
} from "@/lib/visitors/db-mapper";
import { normalizeVisitorDevice } from "@/lib/visitors/device";
import { getIndustryDemo } from "@/lib/visitors/industry-demos";
import { industryLabel } from "@/lib/visitors/industry-options";
import { mapIndustryFormToVisitor } from "@/lib/visitors/industry-form-mapper";
import { visitorPhonesMatch } from "@/lib/visitors/phone";
import { isPreregisterVisitor } from "@/lib/visitors/preregistration";
import { resolveCheckInOwner } from "@/lib/visitors/resolve-check-in-owner";
import { sendVisitorPreRegisterEmail } from "@/lib/visitors/send-visitor-preregister-email";
import type { VisitorRecord } from "@/lib/visitors/types";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

function pickEmail(values: Record<string, unknown>): string | null {
  const email = safeText(values.email, 200);
  return email && email.includes("@") ? email : null;
}

function newPassToken() {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `FX-VIS-${id.replace(/-/g, "")}`;
}

async function insertVisitor(
  admin: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ visitor: VisitorRecord } | { error: string; status: number }> {
  const withDevice = { ...row };
  let data: unknown = null;
  let error: { message?: string; code?: string } | null = null;
  {
    const first = await admin.from("visitors").insert(withDevice).select(VISITOR_SELECT).single();
    data = first.data;
    error = first.error;
  }

  if (error && (isMissingPreregistrationColumns(error) || /source/i.test(String(error.message ?? "")))) {
    const fallbackRow = { ...row };
    delete fallbackRow.registered_device_id;
    delete fallbackRow.device_label;
    fallbackRow.source = "demo_form";
    const retry = await admin.from("visitors").insert(fallbackRow).select(VISITOR_SELECT_BASE).single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (isMissingVisitorsTable(error)) {
      return {
        status: 503,
        error: "Visitor tables not set up. Run database/visitor_management_patch_01.sql in Supabase.",
      };
    }
    if (isMissingPreregistrationColumns(error)) {
      return {
        status: 503,
        error:
          "Run database/visitor_management_patch_11_preregistration.sql in Supabase to enable visitor pre-registration.",
      };
    }
    return { status: 500, error: error.message ?? "Failed to save pre-registration" };
  }

  return { visitor: mapVisitorRow(data as VisitorRow) };
}

export async function createVisitorPreRegistration(
  admin: SupabaseClient,
  input: {
    industrySlug: string;
    ownerId: string;
    values: Record<string, unknown>;
    sendConfirmationEmail?: boolean;
    deviceId?: unknown;
    deviceLabel?: unknown;
    userAgent?: unknown;
    platform?: unknown;
    language?: unknown;
  }
): Promise<
  | {
      ok: true;
      visitor: VisitorRecord;
      venueName: string;
      emailSent: boolean;
    }
  | { ok: false; error: string; status: number }
> {
  if (!input.industrySlug || !getIndustryDemo(input.industrySlug)) {
    return { ok: false, error: "Invalid industry", status: 400 };
  }
  if (!input.ownerId) {
    return {
      ok: false,
      error: "This pre-registration form requires a valid business link.",
      status: 400,
    };
  }

  const owner = await resolveCheckInOwner(admin, input.ownerId);
  if ("error" in owner) {
    return { ok: false, error: owner.error, status: 400 };
  }

  const mapped = mapIndustryFormToVisitor(input.industrySlug, input.values);
  if ("error" in mapped) {
    return { ok: false, error: mapped.error, status: 400 };
  }

  const device = normalizeVisitorDevice({
    deviceId: input.deviceId,
    deviceLabel: input.deviceLabel,
    userAgent: input.userAgent,
    platform: input.platform,
    language: input.language,
  });

  const formExtra = {
    ...mapped.row.form_extra,
    preregister: true,
    device_id: device.deviceId !== "unknown-device" ? device.deviceId : undefined,
    device_label: device.deviceLabel,
  };

  const { data: existingRows, error: existingErr } = await admin
    .from("visitors")
    .select(VISITOR_SELECT_BASE)
    .eq("owner_id", owner.ownerId)
    .eq("visit_date", mapped.row.visit_date)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(80);

  if (existingErr && !isMissingVisitorsTable(existingErr) && !isMissingPreregistrationColumns(existingErr)) {
    return { ok: false, error: existingErr.message, status: 500 };
  }

  const existing = ((existingRows ?? []) as VisitorRow[])
    .map(mapVisitorRow)
    .find(
      (v) =>
        visitorPhonesMatch(v.phoneNumber, mapped.row.phone_number) &&
        (isPreregisterVisitor(v.source, v.formExtra) || v.status === "pending" || v.status === "approved")
    );

  const row: Record<string, unknown> = {
    owner_id: owner.ownerId,
    ...mapped.row,
    form_extra: formExtra,
    status: "approved",
    source: "preregister",
    registered_device_id: device.deviceId !== "unknown-device" ? device.deviceId : null,
    device_label: device.deviceLabel,
    qr_code_token: existing?.qrCodeToken || newPassToken(),
  };

  let visitor: VisitorRecord;
  if (existing) {
    const patch = { ...row };
    delete patch.owner_id;
    delete patch.qr_code_token;
    let data: unknown = null;
    let error: { message?: string } | null = null;
    {
      const first = await admin
        .from("visitors")
        .update(patch)
        .eq("id", existing.id)
        .select(VISITOR_SELECT)
        .single();
      data = first.data;
      error = first.error;
    }
    if (error && isMissingPreregistrationColumns(error)) {
      const fallbackPatch = { ...mapped.row, form_extra: formExtra, status: "approved", source: "demo_form" };
      const retry = await admin
        .from("visitors")
        .update(fallbackPatch)
        .eq("id", existing.id)
        .select(VISITOR_SELECT_BASE)
        .single();
      data = retry.data;
      error = retry.error;
    }
    if (error) {
      return { ok: false, error: error.message ?? "Failed to update pre-registration", status: 500 };
    }
    visitor = mapVisitorRow(data as VisitorRow);
  } else {
    const inserted = await insertVisitor(admin, row);
    if ("error" in inserted) {
      return { ok: false, error: inserted.error, status: inserted.status };
    }
    visitor = inserted.visitor;
  }

  const guestEmail = pickEmail(input.values);
  let emailSent = false;
  if (input.sendConfirmationEmail && guestEmail) {
    const emailResult = await sendVisitorPreRegisterEmail({
      to: guestEmail,
      visitorName: visitor.fullName,
      venueName: owner.venueName,
      visitDate: visitor.visitDate,
      industryLabel: industryLabel(input.industrySlug),
    });
    emailSent = emailResult.ok === true;
  }

  return {
    ok: true,
    visitor,
    venueName: owner.venueName,
    emailSent,
  };
}
