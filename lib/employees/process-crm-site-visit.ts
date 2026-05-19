import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CRM_SITE_SETUP_MESSAGE,
  isMissingCrmSiteTables,
  mapCrmSiteVisitRow,
  type CrmSiteVisitRow,
} from "@/lib/employees/crm-site-db";
import { lookupEmployeeByToken } from "@/lib/employees/process-employee-scan";
import { isValidCoordinate } from "@/lib/visitors/geocode";

export type CrmSiteScanAction = "sign_in" | "sign_out";

export type CrmSiteScanResult =
  | {
      ok: true;
      action: CrmSiteScanAction;
      visit: ReturnType<typeof mapCrmSiteVisitRow>;
      employeeName: string;
    }
  | { ok: false; error: string; status: number };

function parseCoords(lat: unknown, lon: unknown): { lat: number; lon: number } | null {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!isValidCoordinate(latitude, longitude)) return null;
  return { lat: latitude, lon: longitude };
}

export async function processCrmSiteScan(
  admin: SupabaseClient,
  input: {
    token?: unknown;
    action: CrmSiteScanAction;
    projectId?: string | null;
    projectName?: string | null;
    latitude?: unknown;
    longitude?: unknown;
    accuracyMeters?: unknown;
    deviceId?: string | null;
    deviceLabel?: string | null;
  }
): Promise<CrmSiteScanResult> {
  const lookup = await lookupEmployeeByToken(admin, input.token);
  if (!lookup.ok) {
    return { ok: false, error: lookup.error, status: lookup.status };
  }

  const employee = lookup.employee;
  if (employee.memberType !== "crm") {
    return {
      ok: false,
      error: "Site GPS check-in is for CRM team members only. Use the reception QR for staff attendance.",
      status: 403,
    };
  }
  if (employee.status !== "active") {
    return { ok: false, error: "This CRM profile is inactive.", status: 403 };
  }

  const { data: ownerRow } = await admin
    .from("visitor_employees")
    .select("owner_id")
    .eq("id", employee.id)
    .maybeSingle();

  const ownerId = String(ownerRow?.owner_id ?? "");
  if (!ownerId) {
    return { ok: false, error: "Employee not found.", status: 404 };
  }

  const { data: openRows, error: openErr } = await admin
    .from("visitor_crm_site_visits")
    .select("*")
    .eq("employee_id", employee.id)
    .is("sign_out_at", null)
    .order("sign_in_at", { ascending: false })
    .limit(1);

  if (openErr) {
    if (isMissingCrmSiteTables(openErr)) {
      return { ok: false, error: CRM_SITE_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: openErr.message, status: 500 };
  }

  const openVisit = (openRows?.[0] as CrmSiteVisitRow | undefined) ?? null;

  if (input.action === "sign_in") {
    if (openVisit) {
      return {
        ok: false,
        error: `You are still signed in at "${openVisit.project_name}". Sign out there before starting another site visit.`,
        status: 409,
      };
    }

    const coords = parseCoords(input.latitude, input.longitude);
    if (!coords) {
      return {
        ok: false,
        error: "GPS location is required to sign in at a project site. Enable location and try again.",
        status: 400,
      };
    }

    let projectName = String(input.projectName ?? "").trim();
    let projectId: string | null = input.projectId?.trim() || null;

    if (projectId) {
      const { data: proj } = await admin
        .from("visitor_crm_projects")
        .select("id,name,status")
        .eq("id", projectId)
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (!proj || proj.status !== "active") {
        return { ok: false, error: "Project not found or inactive.", status: 404 };
      }
      projectName = String(proj.name);
    }

    if (!projectName) {
      return {
        ok: false,
        error: "Select a project or enter the site / project name.",
        status: 400,
      };
    }

    const accuracy = Number(input.accuracyMeters);
    const { data: inserted, error: insErr } = await admin
      .from("visitor_crm_site_visits")
      .insert({
        owner_id: ownerId,
        employee_id: employee.id,
        project_id: projectId,
        project_name: projectName.slice(0, 200),
        sign_in_latitude: coords.lat,
        sign_in_longitude: coords.lon,
        sign_in_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
        device_id: input.deviceId ?? null,
        device_label: input.deviceLabel ?? null,
      })
      .select("*")
      .single();

    if (insErr) {
      if (isMissingCrmSiteTables(insErr)) {
        return { ok: false, error: CRM_SITE_SETUP_MESSAGE, status: 503 };
      }
      return { ok: false, error: insErr.message, status: 500 };
    }

    return {
      ok: true,
      action: "sign_in",
      visit: mapCrmSiteVisitRow(inserted as CrmSiteVisitRow, employee.fullName),
      employeeName: employee.fullName,
    };
  }

  if (!openVisit) {
    return {
      ok: false,
      error: "No open site visit. Sign in at a project first.",
      status: 409,
    };
  }

  const coords = parseCoords(input.latitude, input.longitude);
  if (!coords) {
    return {
      ok: false,
      error: "GPS location is required to sign out from the site. Enable location and try again.",
      status: 400,
    };
  }

  const accuracy = Number(input.accuracyMeters);
  const signOutAt = new Date().toISOString();
  const { data: updated, error: updErr } = await admin
    .from("visitor_crm_site_visits")
    .update({
      sign_out_at: signOutAt,
      sign_out_latitude: coords.lat,
      sign_out_longitude: coords.lon,
      sign_out_accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
    })
    .eq("id", openVisit.id)
    .select("*")
    .single();

  if (updErr) {
    return { ok: false, error: updErr.message, status: 500 };
  }

  return {
    ok: true,
    action: "sign_out",
    visit: mapCrmSiteVisitRow(updated as CrmSiteVisitRow, employee.fullName),
    employeeName: employee.fullName,
  };
}

export async function getCrmSiteVisitRankings(
  admin: SupabaseClient,
  ownerId: string,
  fromIso: string,
  toIso: string
): Promise<
  | { ok: true; rankings: import("@/lib/employees/crm-site-types").CrmSiteVisitRankEntry[] }
  | { ok: false; error: string }
> {
  const { data: visits, error: vErr } = await admin
    .from("visitor_crm_site_visits")
    .select("id,employee_id,sign_out_at")
    .eq("owner_id", ownerId)
    .gte("sign_in_at", fromIso)
    .lte("sign_in_at", toIso);

  if (vErr) {
    if (isMissingCrmSiteTables(vErr)) {
      return { ok: false, error: CRM_SITE_SETUP_MESSAGE };
    }
    return { ok: false, error: vErr.message };
  }

  const { data: openVisits } = await admin
    .from("visitor_crm_site_visits")
    .select("employee_id")
    .eq("owner_id", ownerId)
    .is("sign_out_at", null);

  const openSet = new Set((openVisits ?? []).map((r) => String(r.employee_id)));

  const completedByEmployee = new Map<string, number>();
  for (const v of visits ?? []) {
    if (!v.sign_out_at) continue;
    const eid = String(v.employee_id);
    completedByEmployee.set(eid, (completedByEmployee.get(eid) ?? 0) + 1);
  }

  const employeeIds = [
    ...new Set([
      ...completedByEmployee.keys(),
      ...(openVisits ?? []).map((r) => String(r.employee_id)),
    ]),
  ];

  if (employeeIds.length === 0) {
    return { ok: true, rankings: [] };
  }

  const { data: employees } = await admin
    .from("visitor_employees")
    .select("id,full_name,member_type")
    .eq("owner_id", ownerId)
    .eq("member_type", "crm")
    .in("id", employeeIds);

  const rankings = (employees ?? [])
    .map((e) => ({
      employeeId: String(e.id),
      fullName: String(e.full_name),
      completedVisits: completedByEmployee.get(String(e.id)) ?? 0,
      openVisit: openSet.has(String(e.id)),
    }))
    .sort((a, b) => {
      if (b.completedVisits !== a.completedVisits) return b.completedVisits - a.completedVisits;
      return a.fullName.localeCompare(b.fullName);
    })
    .map((r, i) => ({
      rank: i + 1,
      ...r,
    }));

  return { ok: true, rankings };
}
