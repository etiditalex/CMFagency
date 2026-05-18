import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EMPLOYEES_SETUP_MESSAGE,
  isMissingEmployeesTable,
} from "@/lib/employees/db-mapper";
import { parseReceptionGateToken } from "@/lib/employees/reception-gate";
import { processEmployeeQrScan } from "@/lib/employees/process-employee-scan";
import type { EmployeeMemberType } from "@/lib/employees/types";
import { normalizeDeviceFingerprint, type DeviceFingerprintInput } from "@/lib/employees/device-fingerprint";

export type ReceptionGateRow = {
  owner_id: string;
  member_type: string;
  gate_token: string;
};

export type ReceptionGateInfo = {
  ownerId: string;
  memberType: EmployeeMemberType;
  gateToken: string;
};

export type RosterEmployee = {
  id: string;
  fullName: string;
  department: string;
  attendanceStatus: "in" | "out";
};

function parseMemberType(raw: string | null | undefined): EmployeeMemberType {
  return String(raw ?? "").toLowerCase() === "crm" ? "crm" : "staff";
}

export async function lookupReceptionGate(
  admin: SupabaseClient,
  gateRaw: unknown
): Promise<
  | { ok: true; gate: ReceptionGateInfo }
  | { ok: false; error: string; status: number }
> {
  const gateToken = parseReceptionGateToken(gateRaw);
  if (!gateToken) {
    return { ok: false, error: "Missing reception QR code.", status: 400 };
  }

  const { data, error } = await admin
    .from("visitor_employee_reception_gates")
    .select("owner_id,member_type,gate_token")
    .eq("gate_token", gateToken)
    .maybeSingle();

  if (error) {
    if (isMissingEmployeesTable(error) || String(error.message).includes("reception_gates")) {
      return { ok: false, error: EMPLOYEES_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Invalid or unknown reception QR code.", status: 404 };
  }

  const row = data as ReceptionGateRow;
  return {
    ok: true,
    gate: {
      ownerId: row.owner_id,
      memberType: parseMemberType(row.member_type),
      gateToken: row.gate_token,
    },
  };
}

export async function listRosterForGate(
  admin: SupabaseClient,
  gateRaw: unknown
): Promise<
  | { ok: true; gate: ReceptionGateInfo; roster: RosterEmployee[] }
  | { ok: false; error: string; status: number }
> {
  const gateLookup = await lookupReceptionGate(admin, gateRaw);
  if (!gateLookup.ok) return gateLookup;

  const { gate } = gateLookup;

  const { data, error } = await admin
    .from("visitor_employees")
    .select("id,full_name,department,attendance_status,member_type,status")
    .eq("owner_id", gate.ownerId)
    .eq("member_type", gate.memberType)
    .eq("status", "active")
    .order("full_name", { ascending: true })
    .limit(500);

  if (error) {
    if (isMissingEmployeesTable(error)) {
      return { ok: false, error: EMPLOYEES_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }

  type RosterRow = {
    id: string;
    full_name: string;
    department: string | null;
    attendance_status: string;
  };

  const roster: RosterEmployee[] = ((data ?? []) as RosterRow[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    department: row.department ?? "",
    attendanceStatus: row.attendance_status === "in" ? "in" : "out",
  }));

  return { ok: true, gate, roster };
}

export async function ensureReceptionGatesForOwner(
  admin: SupabaseClient,
  ownerId: string,
  memberTypes: EmployeeMemberType[]
): Promise<
  | { ok: true; gates: { memberType: EmployeeMemberType; gateToken: string }[] }
  | { ok: false; error: string }
> {
  const gates: { memberType: EmployeeMemberType; gateToken: string }[] = [];

  for (const memberType of memberTypes) {
    const { data: existing } = await admin
      .from("visitor_employee_reception_gates")
      .select("gate_token,member_type")
      .eq("owner_id", ownerId)
      .eq("member_type", memberType)
      .maybeSingle();

    if (existing?.gate_token) {
      gates.push({ memberType, gateToken: String(existing.gate_token) });
      continue;
    }

    const { data: inserted, error } = await admin
      .from("visitor_employee_reception_gates")
      .insert({ owner_id: ownerId, member_type: memberType })
      .select("gate_token,member_type")
      .single();

    if (error) {
      if (String(error.message).includes("reception_gates")) {
        return {
          ok: false,
          error: "Run database/visitor_employees_patch_04_reception_gates.sql in Supabase.",
        };
      }
      return { ok: false, error: error.message };
    }

    gates.push({
      memberType: parseMemberType(inserted.member_type),
      gateToken: String(inserted.gate_token),
    });
  }

  return { ok: true, gates };
}

export async function processEmployeeGateScan(
  admin: SupabaseClient,
  input: DeviceFingerprintInput & {
    gate?: unknown;
    gateToken?: unknown;
    employeeId?: unknown;
    action?: unknown;
    mode?: unknown;
  }
) {
  const gateLookup = await lookupReceptionGate(admin, input.gate ?? input.gateToken);
  if (!gateLookup.ok) return gateLookup;

  const employeeId = String(input.employeeId ?? "").trim();
  if (!employeeId) {
    return { ok: false as const, error: "Select your name to sign in or out.", status: 400 };
  }

  const { data: row, error } = await admin
    .from("visitor_employees")
    .select("qr_code_token,status,member_type,owner_id")
    .eq("id", employeeId)
    .eq("owner_id", gateLookup.gate.ownerId)
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message, status: 500 };
  }
  if (!row) {
    return { ok: false as const, error: "Employee not found.", status: 404 };
  }

  if (parseMemberType(row.member_type) !== gateLookup.gate.memberType) {
    return {
      ok: false as const,
      error: "This person is not on this reception team list.",
      status: 403,
    };
  }

  const token = String(row.qr_code_token ?? "").trim();
  if (!token) {
    return { ok: false as const, error: "Employee pass not ready.", status: 500 };
  }

  return processEmployeeQrScan(admin, {
    ...input,
    token,
    action: input.action ?? input.mode,
    deviceLabel:
      input.deviceLabel ??
      `Reception · ${normalizeDeviceFingerprint(input).deviceLabel}`,
  });
}
