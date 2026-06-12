import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_REPORTING_SETTINGS,
  mapReportingSettingsRow,
  type ReportingSettingsRow,
} from "@/lib/employees/db-mapper";
import { isRetailHospitalityIndustry } from "@/lib/employees/retail-hospitality";
import { RETAIL_HOSPITALITY_SHIFT_DEFAULTS } from "@/lib/employees/shifts";
import type { EmployeeReportingSettings } from "@/lib/employees/types";

export const REPORTING_SETTINGS_SELECT =
  "owner_id,staff_reporting_sign_in_start,staff_reporting_sign_in,staff_reporting_sign_out,crm_reporting_sign_in_start,crm_reporting_sign_in,crm_reporting_sign_out,shift_enabled,shift_1_start_time,shift_1_end_time,shift_2_start_time,shift_2_end_time,shift_1_sign_in_start_time,shift_1_sign_in_time,shift_1_sign_out_time,shift_2_sign_in_start_time,shift_2_sign_in_time,shift_2_sign_out_time,updated_at";

export async function getOrganizationIndustrySlug(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
  const slug = String(meta?.organization_industry ?? meta?.organizationIndustry ?? "").trim();
  return slug || null;
}

export function reportingSettingsForIndustry(
  row: ReportingSettingsRow | null,
  industrySlug: string | null | undefined
): EmployeeReportingSettings {
  const mapped = row ? mapReportingSettingsRow(row) : { ...DEFAULT_REPORTING_SETTINGS };
  if (isRetailHospitalityIndustry(industrySlug) && !row) {
    return { ...mapped, ...RETAIL_HOSPITALITY_SHIFT_DEFAULTS };
  }
  return mapped;
}

export async function fetchOwnerReportingSettings(
  admin: SupabaseClient,
  ownerId: string
): Promise<EmployeeReportingSettings> {
  const [industrySlug, settingsResult] = await Promise.all([
    getOrganizationIndustrySlug(admin, ownerId),
    admin
      .from("visitor_employee_reporting_settings")
      .select(REPORTING_SETTINGS_SELECT)
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);

  if (settingsResult.error) {
    return reportingSettingsForIndustry(null, industrySlug);
  }

  return reportingSettingsForIndustry(
    (settingsResult.data as ReportingSettingsRow | null) ?? null,
    industrySlug
  );
}
