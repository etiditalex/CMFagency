import type { SupabaseClient } from "@supabase/supabase-js";

import {
  EMPLOYEES_SETUP_MESSAGE,
  EMPLOYEE_ATTENDANCE_SELECT,
  isMissingEmployeesTable,
  mapAttendanceRow,
  mapEmployeeRow,
  type EmployeeAttendanceRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import {
  effectiveAttendanceStatus,
  todayLocalBounds,
  validateDailyAttendanceTransition,
} from "@/lib/employees/daily-attendance-rules";
import { normalizeDeviceFingerprint, type DeviceFingerprintInput } from "@/lib/employees/device-fingerprint";
import { fetchOwnerReportingSettings } from "@/lib/employees/fetch-reporting-settings";
import { notifyEmployeeAttendance } from "@/lib/employees/notify-employee-attendance";
import {
  effectiveShiftAttendanceStatus,
  validateShiftAttendanceTransition,
} from "@/lib/employees/shift-attendance-rules";
import { shiftsFromSettings } from "@/lib/employees/shifts";
import type {
  EmployeeAttendanceEventType,
  EmployeeAttendanceRecord,
  EmployeeRecord,
} from "@/lib/employees/types";
import { isValidCoordinate } from "@/lib/visitors/geocode";
import { validateEmployeeScanGps } from "@/lib/visitors/validate-employee-gps";

async function fetchLastEventBeforeToday(
  admin: SupabaseClient,
  employeeId: string,
  todayStartIso: string
): Promise<EmployeeAttendanceRecord | null> {
  const { data } = await admin
    .from("visitor_employee_attendance")
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .eq("employee_id", employeeId)
    .lt("created_at", todayStartIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return mapAttendanceRow(data as EmployeeAttendanceRow);
}

/** Today's sign-in/out state for an employee (includes open overnight sessions). */
export async function fetchTodayAttendanceStatus(
  admin: SupabaseClient,
  employeeId: string
): Promise<"in" | "out"> {
  const { startIso, endIso } = todayLocalBounds();
  const { data: empRow } = await admin
    .from("visitor_employees")
    .select("owner_id")
    .eq("id", employeeId)
    .maybeSingle();

  const { data: todayRows } = await admin
    .from("visitor_employee_attendance")
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .eq("employee_id", employeeId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: true });

  const todayEvents = ((todayRows ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow);
  const lastEventBeforeToday = await fetchLastEventBeforeToday(admin, employeeId, startIso);
  const ownerId = String(empRow?.owner_id ?? "");
  if (ownerId) {
    const reportingSettings = await fetchOwnerReportingSettings(admin, ownerId);
    if (reportingSettings.shiftEnabled) {
      if (todayEvents.length > 0) return effectiveShiftAttendanceStatus(todayEvents);
      return effectiveAttendanceStatus({ todayEvents, lastEventBeforeToday });
    }
  }
  return effectiveAttendanceStatus({ todayEvents, lastEventBeforeToday });
}
function isValidScanCoords(lat: unknown, lon: unknown): boolean {
  return isValidCoordinate(lat, lon);
}

export type EmployeeScanAction = "sign_in" | "sign_out" | "toggle";

export type EmployeeScanResult =
  | {
      ok: true;
      employee: EmployeeRecord;
      eventType: EmployeeAttendanceEventType;
      occurredAt: string;
      deviceLabel: string;
      businessName: string;
      emailSent: boolean;
      employeeEmailSent: boolean;
    }
  | { ok: false; error: string; status: number };

function parseToken(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const urlMatch = s.match(/[?&]token=([^&]+)/i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).trim();
  if (s.startsWith("FX-EMP-")) return s;
  return s.slice(0, 128);
}

function parseScanAction(raw: unknown): EmployeeScanAction {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "sign_in" || s === "sign-in" || s === "in") return "sign_in";
  if (s === "sign_out" || s === "sign-out" || s === "out") return "sign_out";
  return "toggle";
}

export async function lookupEmployeeByToken(
  admin: SupabaseClient,
  tokenRaw: unknown
): Promise<
  | { ok: true; employee: EmployeeRecord }
  | { ok: false; error: string; status: number }
> {
  const token = parseToken(tokenRaw);
  if (!token) {
    return { ok: false, error: "Missing employee QR token.", status: 400 };
  }

  const { data: row, error: findErr } = await admin
    .from("visitor_employees")
    .select(
      "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
    )
    .eq("qr_code_token", token)
    .maybeSingle();

  if (findErr) {
    if (isMissingEmployeesTable(findErr)) {
      return { ok: false, error: EMPLOYEES_SETUP_MESSAGE, status: 503 };
    }
    return { ok: false, error: findErr.message, status: 500 };
  }
  if (!row) {
    return { ok: false, error: "Invalid or unknown employee QR code.", status: 404 };
  }

  return { ok: true, employee: mapEmployeeRow(row as EmployeeRow) };
}

function isKioskScan(input: { kioskScan?: unknown; scanSource?: unknown }): boolean {
  if (input.kioskScan === true || input.kioskScan === "true") return true;
  return String(input.scanSource ?? "").toLowerCase() === "kiosk";
}

export async function processEmployeeQrScan(
  admin: SupabaseClient,
  input: DeviceFingerprintInput & {
    token?: unknown;
    qrToken?: unknown;
    action?: unknown;
    mode?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    accuracyMeters?: unknown;
    accuracy?: unknown;
    kioskScan?: unknown;
    scanSource?: unknown;
  }
): Promise<EmployeeScanResult> {
  const fromKiosk = isKioskScan(input);
  const token = parseToken(input.token ?? input.qrToken);
  if (!token) {
    return { ok: false, error: "Missing employee QR token.", status: 400 };
  }

  const lookup = await lookupEmployeeByToken(admin, token);
  if (!lookup.ok) return lookup;

  const employee = lookup.employee;

  const { data: rowData, error: findErr } = await admin
    .from("visitor_employees")
    .select("owner_id")
    .eq("id", employee.id)
    .maybeSingle();

  if (findErr || !rowData?.owner_id) {
    return { ok: false, error: "Employee not found.", status: 404 };
  }

  const ownerId = String(rowData.owner_id);

  const gpsCheck = await validateEmployeeScanGps(admin, ownerId, {
    latitude: input.latitude,
    longitude: input.longitude,
    accuracyMeters: input.accuracyMeters ?? input.accuracy,
  });
  if (!gpsCheck.ok) {
    return { ok: false, error: gpsCheck.error, status: gpsCheck.status };
  }

  if (employee.status !== "active") {
    return { ok: false, error: "This staff member is inactive.", status: 403 };
  }

  const { startIso, endIso } = todayLocalBounds();
  const { data: todayRows, error: todayErr } = await admin
    .from("visitor_employee_attendance")
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .eq("employee_id", employee.id)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: true });

  if (todayErr && !isMissingEmployeesTable(todayErr)) {
    return { ok: false, error: todayErr.message, status: 500 };
  }

  const todayEvents = ((todayRows ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow);
  const lastEventBeforeToday = await fetchLastEventBeforeToday(admin, employee.id, startIso);
  const reportingSettings = await fetchOwnerReportingSettings(admin, ownerId);
  const shiftEnabled = reportingSettings.shiftEnabled === true;
  const shifts = shiftsFromSettings(reportingSettings);
  const statusToday = shiftEnabled
    ? todayEvents.length > 0
      ? effectiveShiftAttendanceStatus(todayEvents)
      : effectiveAttendanceStatus({ todayEvents, lastEventBeforeToday })
    : effectiveAttendanceStatus({ todayEvents, lastEventBeforeToday });

  const scanAction = parseScanAction(input.action ?? input.mode);
  let eventType: EmployeeAttendanceEventType;

  if (scanAction === "sign_in") {
    eventType = "sign_in";
  } else if (scanAction === "sign_out") {
    eventType = "sign_out";
  } else {
    eventType = statusToday === "in" ? "sign_out" : "sign_in";
  }

  const transitionCheck = shiftEnabled
    ? validateShiftAttendanceTransition({
        todayEvents,
        nextEvent: eventType,
        shiftEnabled: true,
        shifts,
        lastEventBeforeToday,
      })
    : validateDailyAttendanceTransition({
        todayEvents,
        nextEvent: eventType,
        lastEventBeforeToday,
      });
  if (!transitionCheck.ok) {
    return { ok: false, error: transitionCheck.error, status: 409 };
  }

  const shiftNumber =
    shiftEnabled && "shiftNumber" in transitionCheck ? transitionCheck.shiftNumber : undefined;

  const device = normalizeDeviceFingerprint({
    ...input,
    userAgent: input.userAgent,
  });

  if (
    !fromKiosk &&
    employee.registeredDeviceId &&
    device.deviceId !== "unknown-device" &&
    employee.registeredDeviceId !== device.deviceId
  ) {
    return {
      ok: false,
      error:
        "This pass is linked to another phone. Use your own device or ask your manager to reset your device link.",
      status: 403,
    };
  }

  const occurredAt = new Date().toISOString();
  const nextAttendanceStatus = eventType === "sign_in" ? "in" : "out";

  const employeePatch: Record<string, unknown> = {
    attendance_status: nextAttendanceStatus,
    updated_at: occurredAt,
  };
  if (eventType === "sign_in") {
    employeePatch.last_signed_in_at = occurredAt;
    if (
      !fromKiosk &&
      !employee.registeredDeviceId &&
      device.deviceId !== "unknown-device"
    ) {
      employeePatch.registered_device_id = device.deviceId;
    }
  } else {
    employeePatch.last_signed_out_at = occurredAt;
  }

  const { error: updateErr } = await admin
    .from("visitor_employees")
    .update(employeePatch)
    .eq("id", employee.id);

  if (updateErr) {
    return { ok: false, error: updateErr.message, status: 500 };
  }

  const attendanceInsert: Record<string, unknown> = {
    employee_id: employee.id,
    owner_id: ownerId,
    event_type: eventType,
    device_id: device.deviceId,
    device_label: device.deviceLabel,
    device_info: device.deviceInfo,
    gps_verified: gpsCheck.verified,
  };
  if (gpsCheck.verified && isValidScanCoords(input.latitude, input.longitude)) {
    attendanceInsert.scan_latitude = Number(input.latitude);
    attendanceInsert.scan_longitude = Number(input.longitude);
    attendanceInsert.gps_distance_m = gpsCheck.distanceM;
  }
  if (shiftNumber !== undefined) {
    attendanceInsert.shift_number = shiftNumber;
  }

  const { data: attendanceRow, error: attErr } = await admin
    .from("visitor_employee_attendance")
    .insert(attendanceInsert)
    .select(EMPLOYEE_ATTENDANCE_SELECT)
    .single();

  if (attErr) {
    return { ok: false, error: attErr.message, status: 500 };
  }

  mapAttendanceRow(attendanceRow as EmployeeAttendanceRow);

  let businessName = "Your organisation";
  let emailSent = false;
  let employeeEmailSent = false;

  try {
    const notifyResult = await notifyEmployeeAttendance(admin, {
      ownerId,
      employeeName: employee.fullName,
      employeeEmail: employee.email,
      employeeCode: employee.employeeCode,
      department: employee.department,
      eventType,
      occurredAt,
      deviceLabel: device.deviceLabel,
    });
    emailSent = notifyResult.emailSent;
    employeeEmailSent = notifyResult.employeeEmailSent;
    businessName = notifyResult.businessName;
  } catch (e) {
    console.warn(
      "[processEmployeeQrScan] attendance email failed:",
      e instanceof Error ? e.message : e
    );
  }

  const updatedEmployee: EmployeeRecord = {
    ...employee,
    attendanceStatus: nextAttendanceStatus,
    registeredDeviceId: fromKiosk
      ? employee.registeredDeviceId
      : employee.registeredDeviceId ??
        (device.deviceId !== "unknown-device" ? device.deviceId : null),
    lastSignedInAt: eventType === "sign_in" ? occurredAt : employee.lastSignedInAt,
    lastSignedOutAt: eventType === "sign_out" ? occurredAt : employee.lastSignedOutAt,
    updatedAt: occurredAt,
  };

  return {
    ok: true,
    employee: updatedEmployee,
    eventType,
    occurredAt,
    deviceLabel: device.deviceLabel,
    businessName,
    emailSent,
    employeeEmailSent,
  };
}
