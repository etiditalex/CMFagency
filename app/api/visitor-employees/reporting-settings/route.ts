import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_REPORTING_SETTINGS,
  isMissingEmployeesTable,
  mapReportingSettingsRow,
  type ReportingSettingsRow,
} from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

function parseTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const ownerId = isAdmin ? req.nextUrl.searchParams.get("ownerId")?.trim() || userId : userId;

    const { data, error } = await admin
      .from("visitor_employee_reporting_settings")
      .select(
        "owner_id,staff_reporting_sign_in,staff_reporting_sign_out,crm_reporting_sign_in,crm_reporting_sign_out,updated_at"
      )
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      if (isMissingEmployeesTable(error) || String(error.message).includes("reporting_settings")) {
        return NextResponse.json({
          settings: DEFAULT_REPORTING_SETTINGS,
          setupRequired: true,
          message: "Run database/visitor_employees_patch_03_real_estate_crm.sql in Supabase.",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = data
      ? mapReportingSettingsRow(data as ReportingSettingsRow)
      : DEFAULT_REPORTING_SETTINGS;

    return NextResponse.json({ settings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const staffIn = parseTime(body.staffReportingSignIn ?? body.staff_reporting_sign_in);
    const staffOut = parseTime(body.staffReportingSignOut ?? body.staff_reporting_sign_out);
    const crmIn = parseTime(body.crmReportingSignIn ?? body.crm_reporting_sign_in);
    const crmOut = parseTime(body.crmReportingSignOut ?? body.crm_reporting_sign_out);

    if (!staffIn || !staffOut || !crmIn || !crmOut) {
      return NextResponse.json({ error: "All reporting times must be HH:mm format." }, { status: 400 });
    }

    const row = {
      owner_id: userId,
      staff_reporting_sign_in: staffIn,
      staff_reporting_sign_out: staffOut,
      crm_reporting_sign_in: crmIn,
      crm_reporting_sign_out: crmOut,
    };

    const { data, error } = await admin
      .from("visitor_employee_reporting_settings")
      .upsert(row, { onConflict: "owner_id" })
      .select(
        "owner_id,staff_reporting_sign_in,staff_reporting_sign_out,crm_reporting_sign_in,crm_reporting_sign_out,updated_at"
      )
      .single();

    if (error) {
      if (String(error.message).includes("reporting_settings")) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_03_real_estate_crm.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: mapReportingSettingsRow(data as ReportingSettingsRow) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
