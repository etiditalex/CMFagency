import type { CrmProjectRecord, CrmSiteVisitRecord } from "@/lib/employees/crm-site-types";

export type CrmProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CrmSiteVisitRow = {
  id: string;
  owner_id: string;
  employee_id: string;
  project_id: string | null;
  project_name: string;
  sign_in_at: string;
  sign_out_at: string | null;
  sign_in_latitude: number;
  sign_in_longitude: number;
  sign_in_accuracy_m: number | null;
  sign_out_latitude: number | null;
  sign_out_longitude: number | null;
  sign_out_accuracy_m: number | null;
  device_id: string | null;
  device_label: string | null;
  created_at: string;
  updated_at: string;
};

export const CRM_SITE_SETUP_MESSAGE =
  "Run database/visitor_employees_patch_07_crm_site_gps.sql in Supabase.";

export function isMissingCrmSiteTables(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return (
    code === "42P01" ||
    (msg.includes("visitor_crm_site_visits") && msg.includes("does not exist")) ||
    (msg.includes("visitor_crm_projects") && msg.includes("does not exist"))
  );
}

export function mapCrmProjectRow(row: CrmProjectRow): CrmProjectRecord {
  return {
    id: row.id,
    name: row.name,
    addressLine1: row.address_line1 ?? "",
    addressLine2: row.address_line2 ?? "",
    suburb: row.suburb ?? "",
    state: row.state ?? "",
    postcode: row.postcode ?? "",
    country: row.country ?? "Kenya",
    latitude: row.latitude,
    longitude: row.longitude,
    geofenceRadiusM: row.geofence_radius_m ?? 200,
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCrmSiteVisitRow(
  row: CrmSiteVisitRow,
  employeeName: string
): CrmSiteVisitRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName,
    projectId: row.project_id,
    projectName: row.project_name,
    signInAt: row.sign_in_at,
    signOutAt: row.sign_out_at,
    signInLatitude: row.sign_in_latitude,
    signInLongitude: row.sign_in_longitude,
    signInAccuracyM: row.sign_in_accuracy_m,
    signOutLatitude: row.sign_out_latitude,
    signOutLongitude: row.sign_out_longitude,
    signOutAccuracyM: row.sign_out_accuracy_m,
    deviceLabel: row.device_label,
  };
}
