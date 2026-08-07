import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EMPLOYEES_SETUP_MESSAGE,
  isMissingEmployeesTable,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import {
  normalizeDeviceFingerprint,
  type DeviceFingerprintInput,
} from "@/lib/employees/device-fingerprint";
import { parseReceptionGateToken } from "@/lib/employees/reception-gate";
import {
  fetchTodayAttendanceStatus,
  processEmployeeQrScan,
} from "@/lib/employees/process-employee-scan";
import type { EmployeeMemberType, EmployeeRecord } from "@/lib/employees/types";

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

export type BoundGateEmployee = {
  id: string;
  fullName: string;
  department: string;
  employeeCode: string;
  attendanceStatus: "in" | "out";
  lastSignedInAt: string | null;
  lastSignedOutAt: string | null;
};

const EMPLOYEE_SELECT =
  "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at";

function parseMemberType(raw: string | null | undefined): EmployeeMemberType {
  return String(raw ?? "").toLowerCase() === "crm" ? "crm" : "staff";
}

function normalizeMemberCode(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

async function mapBoundEmployee(
  admin: SupabaseClient,
  employee: EmployeeRecord
): Promise<BoundGateEmployee> {
  const attendanceStatus = await fetchTodayAttendanceStatus(admin, employee.id);
  return {
    id: employee.id,
    fullName: employee.fullName,
    department: employee.department,
    employeeCode: employee.employeeCode ?? "",
    attendanceStatus,
    lastSignedInAt: employee.lastSignedInAt,
    lastSignedOutAt: employee.lastSignedOutAt,
  };
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

async function findEmployeeBoundToDevice(
  admin: SupabaseClient,
  ownerId: string,
  memberType: EmployeeMemberType,
  deviceId: string
): Promise<EmployeeRecord | null> {
  if (!deviceId || deviceId === "unknown-device") return null;

  const { data, error } = await admin
    .from("visitor_employees")
    .select(EMPLOYEE_SELECT)
    .eq("owner_id", ownerId)
    .eq("member_type", memberType)
    .eq("registered_device_id", deviceId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return mapEmployeeRow(data as EmployeeRow);
}

async function findEmployeeByMemberCode(
  admin: SupabaseClient,
  ownerId: string,
  memberType: EmployeeMemberType,
  memberCode: string
): Promise<EmployeeRecord | null> {
  if (!memberCode) return null;

  const { data, error } = await admin
    .from("visitor_employees")
    .select(EMPLOYEE_SELECT)
    .eq("owner_id", ownerId)
    .eq("member_type", memberType)
    .eq("status", "active")
    .ilike("employee_code", memberCode)
    .maybeSingle();

  if (error || !data) return null;
  return mapEmployeeRow(data as EmployeeRow);
}

async function deviceUsedByOtherEmployee(
  admin: SupabaseClient,
  ownerId: string,
  deviceId: string,
  exceptEmployeeId: string
): Promise<EmployeeRecord | null> {
  if (!deviceId || deviceId === "unknown-device") return null;

  const { data, error } = await admin
    .from("visitor_employees")
    .select(EMPLOYEE_SELECT)
    .eq("owner_id", ownerId)
    .eq("registered_device_id", deviceId)
    .neq("id", exceptEmployeeId)
    .maybeSingle();

  if (error || !data) return null;
  return mapEmployeeRow(data as EmployeeRow);
}

function assertDeviceAccess(
  employee: EmployeeRecord,
  deviceId: string,
  otherOnDevice: EmployeeRecord | null
): { ok: true } | { ok: false; error: string; status: number } {
  if (otherOnDevice) {
    return {
      ok: false,
      error: `This phone is already linked to ${otherOnDevice.fullName}. Enter your member ID to use this device, or ask your manager to tap Reset phone on ${otherOnDevice.fullName}.`,
      status: 403,
    };
  }

  if (
    employee.registeredDeviceId &&
    deviceId !== "unknown-device" &&
    employee.registeredDeviceId !== deviceId
  ) {
    return {
      ok: false,
      error:
        "This member ID is linked to another phone. Enter your member ID again to move the link here, or ask your manager to tap Reset phone on your employee row.",
      status: 403,
    };
  }

  return { ok: true };
}

export async function listRosterForGate(
  admin: SupabaseClient,
  gateRaw: unknown,
  deviceIdRaw?: unknown
): Promise<
  | {
      ok: true;
      gate: ReceptionGateInfo;
      boundEmployee: BoundGateEmployee | null;
      needsSetup: boolean;
    }
  | { ok: false; error: string; status: number }
> {
  const gateLookup = await lookupReceptionGate(admin, gateRaw);
  if (!gateLookup.ok) return gateLookup;

  const { gate } = gateLookup;
  const deviceId = String(deviceIdRaw ?? "").trim();

  const bound = await findEmployeeBoundToDevice(admin, gate.ownerId, gate.memberType, deviceId);

  return {
    ok: true,
    gate,
    boundEmployee: bound ? await mapBoundEmployee(admin, bound) : null,
    needsSetup: !bound,
  };
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
    memberCode?: unknown;
    employee_code?: unknown;
    action?: unknown;
    mode?: unknown;
  }
) {
  const gateLookup = await lookupReceptionGate(admin, input.gate ?? input.gateToken);
  if (!gateLookup.ok) return gateLookup;

  const { gate } = gateLookup;
  const device = normalizeDeviceFingerprint(input);
  const memberCode = normalizeMemberCode(input.memberCode ?? input.employee_code);
  const employeeIdHint = String(input.employeeId ?? "").trim();

  let employee: EmployeeRecord | null = await findEmployeeBoundToDevice(
    admin,
    gate.ownerId,
    gate.memberType,
    device.deviceId
  );

  if (!employee && memberCode) {
    employee = await findEmployeeByMemberCode(admin, gate.ownerId, gate.memberType, memberCode);
    if (!employee) {
      return {
        ok: false as const,
        error: "Member ID not found. Check the code from your manager and try again.",
        status: 404,
      };
    }
  }

  if (!employee && employeeIdHint) {
    const { data } = await admin
      .from("visitor_employees")
      .select(EMPLOYEE_SELECT)
      .eq("id", employeeIdHint)
      .eq("owner_id", gate.ownerId)
      .maybeSingle();
    if (data) employee = mapEmployeeRow(data as EmployeeRow);
  }

  if (!employee) {
    return {
      ok: false as const,
      error: device.deviceId !== "unknown-device"
        ? "Enter your member ID on first visit to link this phone."
        : "Enter your member ID to sign in or out.",
      status: 400,
    };
  }

  if (parseMemberType(employee.memberType) !== gate.memberType) {
    return {
      ok: false as const,
      error: "This member ID belongs to the other team gate. Scan the correct reception QR.",
      status: 403,
    };
  }

  if (employee.status !== "active") {
    return { ok: false as const, error: "This staff member is inactive.", status: 403 };
  }

  const otherOnDevice = await deviceUsedByOtherEmployee(
    admin,
    gate.ownerId,
    device.deviceId,
    employee.id
  );

  // Entering a member ID explicitly allows taking over a shared reception device
  // (previous staff stay linked until Reset phone, which blocked later employees).
  if (memberCode) {
    const now = new Date().toISOString();
    if (otherOnDevice) {
      await admin
        .from("visitor_employees")
        .update({ registered_device_id: null, updated_at: now })
        .eq("id", otherOnDevice.id)
        .eq("owner_id", gate.ownerId);
    }
    if (
      employee.registeredDeviceId &&
      device.deviceId !== "unknown-device" &&
      employee.registeredDeviceId !== device.deviceId
    ) {
      await admin
        .from("visitor_employees")
        .update({ registered_device_id: null, updated_at: now })
        .eq("id", employee.id)
        .eq("owner_id", gate.ownerId);
      employee = { ...employee, registeredDeviceId: null };
    }
  } else {
    const access = assertDeviceAccess(employee, device.deviceId, otherOnDevice);
    if (!access.ok) return access;
  }

  if (!employee.registeredDeviceId && !memberCode && device.deviceId !== "unknown-device") {
    return {
      ok: false as const,
      error: "Enter your member ID once to link this phone, then you can sign in without it.",
      status: 400,
    };
  }

  const token = String(employee.qrCodeToken ?? "").trim();
  if (!token) {
    return { ok: false as const, error: "Employee pass not ready.", status: 500 };
  }

  return processEmployeeQrScan(admin, {
    ...input,
    token,
    action: input.action ?? input.mode,
    deviceLabel:
      input.deviceLabel ?? `Reception · ${normalizeDeviceFingerprint(input).deviceLabel}`,
  });
}
