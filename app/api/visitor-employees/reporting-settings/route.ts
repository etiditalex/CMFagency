import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_REPORTING_SETTINGS,
  isMissingEmployeesTable,
  mapReportingSettingsRow,
  type ReportingSettingsRow,
} from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

const REPORTING_SELECT =
  "owner_id,staff_reporting_sign_in_start,staff_reporting_sign_in,staff_reporting_sign_out,crm_reporting_sign_in_start,crm_reporting_sign_in,crm_reporting_sign_out,updated_at";

function parseTime(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  return null;
}

function minutesFromTime(time24: string): number {
  const m = time24.match(/^(\d{2}):(\d{2})/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function validateSignInWindow(start: string, latest: string): string | null {
  if (minutesFromTime(start) > minutesFromTime(latest)) {
    return "Sign-in start must be before or equal to the latest on-time sign-in.";
  }
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
      .select(REPORTING_SELECT)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      if (isMissingEmployeesTable(error) || String(error.message).includes("reporting_settings")) {
        return NextResponse.json({
          settings: DEFAULT_REPORTING_SETTINGS,
          setupRequired: true,
          message:
            "Run database/visitor_employees_patch_03_real_estate_crm.sql and visitor_employees_patch_06_reporting_windows.sql in Supabase.",
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

    const staffInStart = parseTime(
      body.staffReportingSignInStart ?? body.staff_reporting_sign_in_start
    );
    const staffIn = parseTime(body.staffReportingSignIn ?? body.staff_reporting_sign_in);
    const staffOut = parseTime(body.staffReportingSignOut ?? body.staff_reporting_sign_out);
    const crmInStart = parseTime(body.crmReportingSignInStart ?? body.crm_reporting_sign_in_start);
    const crmIn = parseTime(body.crmReportingSignIn ?? body.crm_reporting_sign_in);
    const crmOut = parseTime(body.crmReportingSignOut ?? body.crm_reporting_sign_out);

    if (!staffInStart || !staffIn || !staffOut || !crmInStart || !crmIn || !crmOut) {
      return NextResponse.json({ error: "All reporting times must be HH:mm format." }, { status: 400 });
    }

    const staffWindowErr = validateSignInWindow(staffInStart, staffIn);
    if (staffWindowErr) {
      return NextResponse.json({ error: staffWindowErr }, { status: 400 });
    }
    const crmWindowErr = validateSignInWindow(crmInStart, crmIn);
    if (crmWindowErr) {
      return NextResponse.json({ error: crmWindowErr }, { status: 400 });
    }

    const row = {
      owner_id: userId,
      staff_reporting_sign_in_start: staffInStart,
      staff_reporting_sign_in: staffIn,
      staff_reporting_sign_out: staffOut,
      crm_reporting_sign_in_start: crmInStart,
      crm_reporting_sign_in: crmIn,
      crm_reporting_sign_out: crmOut,
    };

    const { data, error } = await admin
      .from("visitor_employee_reporting_settings")
      .upsert(row, { onConflict: "owner_id" })
      .select(REPORTING_SELECT)
      .single();

    if (error) {
      if (String(error.message).includes("reporting_settings")) {
        return NextResponse.json(
          {
            error:
              "Run database/visitor_employees_patch_03_real_estate_crm.sql and visitor_employees_patch_06_reporting_windows.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      if (String(error.message).includes("staff_reporting_sign_in_start")) {
        return NextResponse.json(
          {
            error: "Run database/visitor_employees_patch_06_reporting_windows.sql in Supabase.",
          },
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
