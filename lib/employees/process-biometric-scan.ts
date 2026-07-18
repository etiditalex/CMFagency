import type { SupabaseClient } from "@supabase/supabase-js";

import {
  BIOMETRIC_SETUP_MESSAGE,
  createBiometricTerminalToken,
  fingerLabelForIndex,
  isMissingBiometricTable,
  mapBiometricEnrollmentRow,
  mapBiometricTerminalRow,
  parseBiometricTerminalToken,
  parseFingerIndex,
  type BiometricEnrollmentRecord,
  type BiometricTerminalRecord,
} from "@/lib/employees/biometric";
import {
  EMPLOYEES_SETUP_MESSAGE,
  isMissingEmployeesTable,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import type { DeviceFingerprintInput } from "@/lib/employees/device-fingerprint";
import {
  processEmployeeQrScan,
  type EmployeeScanResult,
} from "@/lib/employees/process-employee-scan";
import type { EmployeeRecord } from "@/lib/employees/types";

const EMPLOYEE_SELECT =
  "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at";

const ENROLLMENT_SELECT =
  "id,owner_id,employee_id,finger_index,finger_label,status,vendor,external_id,enrolled_at,last_matched_at,revoked_at";

function normalizeMemberCode(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export async function ensureBiometricTerminalForOwner(
  admin: SupabaseClient,
  ownerId: string,
  name = "Reception fingerprint terminal"
): Promise<
  | { ok: true; terminal: BiometricTerminalRecord }
  | { ok: false; error: string; setupRequired?: boolean }
> {
  const { data: existing, error: findErr } = await admin
    .from("visitor_employee_biometric_terminals")
    .select("id,owner_id,name,terminal_token,status")
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (findErr) {
    if (isMissingBiometricTable(findErr) || isMissingEmployeesTable(findErr)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, setupRequired: true };
    }
    return { ok: false, error: findErr.message };
  }

  if (existing) {
    return { ok: true, terminal: mapBiometricTerminalRow(existing) };
  }

  const token = createBiometricTerminalToken();
  const now = new Date().toISOString();
  const { data: inserted, error: insertErr } = await admin
    .from("visitor_employee_biometric_terminals")
    .insert({
      owner_id: ownerId,
      name,
      terminal_token: token,
      status: "active",
      created_at: now,
      updated_at: now,
    })
    .select("id,owner_id,name,terminal_token,status")
    .single();

  if (insertErr) {
    if (isMissingBiometricTable(insertErr)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, setupRequired: true };
    }
    return { ok: false, error: insertErr.message };
  }

  return { ok: true, terminal: mapBiometricTerminalRow(inserted) };
}

export async function lookupBiometricTerminal(
  admin: SupabaseClient,
  terminalRaw: unknown
): Promise<
  | { ok: true; terminal: BiometricTerminalRecord }
  | { ok: false; error: string; status: number }
> {
  const terminalToken = parseBiometricTerminalToken(terminalRaw);
  if (!terminalToken) {
    return { ok: false, error: "Missing biometric terminal code.", status: 400 };
  }

  const { data, error } = await admin
    .from("visitor_employee_biometric_terminals")
    .select("id,owner_id,name,terminal_token,status")
    .eq("terminal_token", terminalToken)
    .maybeSingle();

  if (error) {
    if (isMissingBiometricTable(error)) {
      return { ok: false, error: BIOMETRIC_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: error.message, status: 500 };
  }
  if (!data) {
    return { ok: false, error: "Invalid or unknown biometric terminal.", status: 404 };
  }

  const terminal = mapBiometricTerminalRow(data);
  if (terminal.status !== "active") {
    return { ok: false, error: "This biometric terminal is disabled.", status: 403 };
  }
  return { ok: true, terminal };
}

async function findEmployeeByMemberCode(
  admin: SupabaseClient,
  ownerId: string,
  memberCode: string
): Promise<EmployeeRecord | null> {
  if (!memberCode) return null;
  const { data, error } = await admin
    .from("visitor_employees")
    .select(EMPLOYEE_SELECT)
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .ilike("employee_code", memberCode)
    .maybeSingle();
  if (error || !data) return null;
  return mapEmployeeRow(data as EmployeeRow);
}

async function findActiveEnrollment(
  admin: SupabaseClient,
  employeeId: string,
  fingerIndex: number
): Promise<BiometricEnrollmentRecord | null> {
  const { data, error } = await admin
    .from("visitor_employee_biometric_enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("employee_id", employeeId)
    .eq("finger_index", fingerIndex)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  return mapBiometricEnrollmentRow(data);
}

async function findEnrollmentByExternalId(
  admin: SupabaseClient,
  ownerId: string,
  externalId: string
): Promise<{ enrollment: BiometricEnrollmentRecord; employee: EmployeeRecord } | null> {
  const { data, error } = await admin
    .from("visitor_employee_biometric_enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("owner_id", ownerId)
    .eq("external_id", externalId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  const enrollment = mapBiometricEnrollmentRow(data);
  const { data: emp, error: empErr } = await admin
    .from("visitor_employees")
    .select(EMPLOYEE_SELECT)
    .eq("id", enrollment.employeeId)
    .eq("status", "active")
    .maybeSingle();
  if (empErr || !emp) return null;
  return { enrollment, employee: mapEmployeeRow(emp as EmployeeRow) };
}

export async function processEmployeeBiometricScan(
  admin: SupabaseClient,
  input: DeviceFingerprintInput & {
    terminal?: unknown;
    terminalToken?: unknown;
    memberCode?: unknown;
    member_code?: unknown;
    fingerIndex?: unknown;
    finger_index?: unknown;
    externalId?: unknown;
    external_id?: unknown;
    action?: unknown;
    mode?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    accuracyMeters?: unknown;
    accuracy?: unknown;
  }
): Promise<EmployeeScanResult & { fingerLabel?: string }> {
  const terminalLookup = await lookupBiometricTerminal(
    admin,
    input.terminal ?? input.terminalToken
  );
  if (!terminalLookup.ok) {
    return {
      ok: false,
      error: terminalLookup.error,
      status: terminalLookup.status,
    };
  }

  const terminal = terminalLookup.terminal;
  const externalId = String(input.externalId ?? input.external_id ?? "").trim();
  let employee: EmployeeRecord | null = null;
  let enrollment: BiometricEnrollmentRecord | null = null;
  let fingerLabel = "";

  if (externalId) {
    const byExternal = await findEnrollmentByExternalId(admin, terminal.ownerId, externalId);
    if (!byExternal) {
      return {
        ok: false,
        error: "No active fingerprint enrollment matches this scanner id.",
        status: 404,
      };
    }
    employee = byExternal.employee;
    enrollment = byExternal.enrollment;
    fingerLabel = enrollment.fingerLabel;
  } else {
    const memberCode = normalizeMemberCode(input.memberCode ?? input.member_code);
    const fingerIndex = parseFingerIndex(input.fingerIndex ?? input.finger_index);
    if (!memberCode) {
      return { ok: false, error: "Enter your member ID to continue.", status: 400 };
    }
    if (!fingerIndex) {
      return { ok: false, error: "Select which finger to scan.", status: 400 };
    }

    employee = await findEmployeeByMemberCode(admin, terminal.ownerId, memberCode);
    if (!employee) {
      return { ok: false, error: "Member ID not found for this organisation.", status: 404 };
    }

    enrollment = await findActiveEnrollment(admin, employee.id, fingerIndex);
    if (!enrollment) {
      return {
        ok: false,
        error: `${fingerLabelForIndex(fingerIndex)} is not enrolled for this employee.`,
        status: 404,
      };
    }
    fingerLabel = enrollment.fingerLabel;
  }

  if (!employee.qrCodeToken) {
    return { ok: false, error: "Employee QR token missing. Re-save the employee record.", status: 500 };
  }

  const result = await processEmployeeQrScan(admin, {
    ...input,
    token: employee.qrCodeToken,
    kioskScan: true,
    scanSource: "biometric",
    deviceLabel: input.deviceLabel ?? `Biometric · ${fingerLabel || "fingerprint"}`,
  });

  if (!result.ok) {
    if (isMissingEmployeesTable({ message: result.error })) {
      return { ok: false, error: EMPLOYEES_SETUP_MESSAGE, status: 503 };
    }
    return result;
  }

  const matchedAt = new Date().toISOString();
  await admin
    .from("visitor_employee_biometric_enrollments")
    .update({ last_matched_at: matchedAt, updated_at: matchedAt })
    .eq("id", enrollment.id);

  return { ...result, fingerLabel };
}
