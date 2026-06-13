import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_REPORTING_SETTINGS,
  isMissingEmployeesTable,
  mapReportingSettingsRow,
  type ReportingSettingsRow,
} from "@/lib/employees/db-mapper";
import {
  getOrganizationIndustrySlug,
  REPORTING_SETTINGS_SELECT,
  reportingSettingsForIndustry,
} from "@/lib/employees/fetch-reporting-settings";
import { isRetailHospitalityIndustry } from "@/lib/employees/retail-hospitality";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";

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

function validateShiftWindow(
  label: string,
  signInStart: string,
  signInLatest: string,
  signOut: string
): string | null {
  const windowErr = validateSignInWindow(signInStart, signInLatest);
  if (windowErr) return `${label}: ${windowErr}`;
  if (minutesFromTime(signOut) < minutesFromTime(signInStart)) {
    return `${label}: Sign-out must be after sign-in start.`;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner") ?? req.nextUrl.searchParams.get("ownerId")
    );
    if (!scope.ok) {
      return adminOwnerScopeErrorResponse(scope)!;
    }
    const ownerId = scope.ownerId;

    const industrySlug = await getOrganizationIndustrySlug(admin, ownerId);

    const { data, error } = await admin
      .from("visitor_employee_reporting_settings")
      .select(REPORTING_SETTINGS_SELECT)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) {
      if (isMissingEmployeesTable(error) || String(error.message).includes("reporting_settings")) {
        return NextResponse.json({
          settings: reportingSettingsForIndustry(null, industrySlug),
          setupRequired: true,
          message:
            "Run database/visitor_employees_patch_03_real_estate_crm.sql, visitor_employees_patch_06_reporting_windows.sql, and visitor_employees_patch_10_shift_support.sql in Supabase.",
        });
      }
      if (String(error.message).includes("shift_enabled")) {
        return NextResponse.json({
          settings: reportingSettingsForIndustry(
            (data as ReportingSettingsRow | null) ?? null,
            industrySlug
          ),
          setupRequired: true,
          message: "Run database/visitor_employees_patch_10_shift_support.sql in Supabase.",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = reportingSettingsForIndustry(
      (data as ReportingSettingsRow | null) ?? null,
      industrySlug
    );

    return NextResponse.json({ settings, isRetailHospitality: isRetailHospitalityIndustry(industrySlug) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner") ?? req.nextUrl.searchParams.get("ownerId")
    );
    if (!scope.ok) {
      return adminOwnerScopeErrorResponse(scope)!;
    }
    const ownerId = scope.ownerId;

    const industrySlug = await getOrganizationIndustrySlug(admin, ownerId);
    const isRetailHospitality = isRetailHospitalityIndustry(industrySlug);

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

    const shiftEnabled =
      body.shiftEnabled === true ||
      body.shift_enabled === true ||
      (isRetailHospitality && body.shiftEnabled !== false && body.shift_enabled !== false);

    const row: Record<string, unknown> = {
      owner_id: ownerId,
      staff_reporting_sign_in_start: staffInStart,
      staff_reporting_sign_in: staffIn,
      staff_reporting_sign_out: staffOut,
      crm_reporting_sign_in_start: crmInStart,
      crm_reporting_sign_in: crmIn,
      crm_reporting_sign_out: crmOut,
      shift_enabled: shiftEnabled,
    };

    if (shiftEnabled) {
      const shift1SignInStart = parseTime(body.shift1SignInStartTime ?? body.shift_1_sign_in_start_time);
      const shift1SignIn = parseTime(body.shift1SignInTime ?? body.shift_1_sign_in_time);
      const shift1SignOut = parseTime(body.shift1SignOutTime ?? body.shift_1_sign_out_time);
      const shift1Start = parseTime(body.shift1StartTime ?? body.shift_1_start_time);
      const shift1End = parseTime(body.shift1EndTime ?? body.shift_1_end_time);
      const shift2SignInStart = parseTime(body.shift2SignInStartTime ?? body.shift_2_sign_in_start_time);
      const shift2SignIn = parseTime(body.shift2SignInTime ?? body.shift_2_sign_in_time);
      const shift2SignOut = parseTime(body.shift2SignOutTime ?? body.shift_2_sign_out_time);
      const shift2Start = parseTime(body.shift2StartTime ?? body.shift_2_start_time);
      const shift2End = parseTime(body.shift2EndTime ?? body.shift_2_end_time);

      if (
        !shift1SignInStart ||
        !shift1SignIn ||
        !shift1SignOut ||
        !shift1Start ||
        !shift1End ||
        !shift2SignInStart ||
        !shift2SignIn ||
        !shift2SignOut ||
        !shift2Start ||
        !shift2End
      ) {
        return NextResponse.json({ error: "All shift times must be HH:mm format." }, { status: 400 });
      }

      const shift1Err = validateShiftWindow("Shift 1", shift1SignInStart, shift1SignIn, shift1SignOut);
      if (shift1Err) return NextResponse.json({ error: shift1Err }, { status: 400 });
      const shift2Err = validateShiftWindow("Shift 2", shift2SignInStart, shift2SignIn, shift2SignOut);
      if (shift2Err) return NextResponse.json({ error: shift2Err }, { status: 400 });

      Object.assign(row, {
        shift_1_start_time: shift1Start,
        shift_1_end_time: shift1End,
        shift_2_start_time: shift2Start,
        shift_2_end_time: shift2End,
        shift_1_sign_in_start_time: shift1SignInStart,
        shift_1_sign_in_time: shift1SignIn,
        shift_1_sign_out_time: shift1SignOut,
        shift_2_sign_in_start_time: shift2SignInStart,
        shift_2_sign_in_time: shift2SignIn,
        shift_2_sign_out_time: shift2SignOut,
      });
    }

    const { data, error } = await admin
      .from("visitor_employee_reporting_settings")
      .upsert(row, { onConflict: "owner_id" })
      .select(REPORTING_SETTINGS_SELECT)
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
      if (
        String(error.message).includes("staff_reporting_sign_in_start") ||
        String(error.message).includes("shift_")
      ) {
        return NextResponse.json(
          {
            error:
              "Run database/visitor_employees_patch_06_reporting_windows.sql and visitor_employees_patch_10_shift_support.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      settings: mapReportingSettingsRow(data as ReportingSettingsRow),
      isRetailHospitality,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
