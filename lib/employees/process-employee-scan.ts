import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mapAttendanceRow,
  mapEmployeeRow,
  type EmployeeAttendanceRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { normalizeDeviceFingerprint, type DeviceFingerprintInput } from "@/lib/employees/device-fingerprint";
import { notifyEmployeeAttendance } from "@/lib/employees/notify-employee-attendance";
import type { EmployeeAttendanceEventType, EmployeeRecord } from "@/lib/employees/types";

export type EmployeeScanResult =
  | {
      ok: true;
      employee: EmployeeRecord;
      eventType: EmployeeAttendanceEventType;
      occurredAt: string;
      deviceLabel: string;
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

export async function processEmployeeQrScan(
  admin: SupabaseClient,
  input: DeviceFingerprintInput & { token?: unknown; qrToken?: unknown }
): Promise<EmployeeScanResult> {
  const token = parseToken(input.token ?? input.qrToken);
  if (!token) {
    return { ok: false, error: "Missing employee QR token.", status: 400 };
  }

  const { data: row, error: findErr } = await admin
    .from("visitor_employees")
    .select(
      "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,created_at,updated_at"
    )
    .eq("qr_code_token", token)
    .maybeSingle();

  if (findErr) {
    return { ok: false, error: findErr.message, status: 500 };
  }
  if (!row) {
    return { ok: false, error: "Invalid or unknown employee QR code.", status: 404 };
  }

  const employee = mapEmployeeRow(row as EmployeeRow);
  if (employee.status !== "active") {
    return { ok: false, error: "This staff member is inactive.", status: 403 };
  }

  const device = normalizeDeviceFingerprint({
    ...input,
    userAgent: input.userAgent,
  });

  const eventType: EmployeeAttendanceEventType =
    employee.attendanceStatus === "in" ? "sign_out" : "sign_in";
  const occurredAt = new Date().toISOString();
  const nextAttendanceStatus = eventType === "sign_in" ? "in" : "out";

  const employeePatch: Record<string, unknown> = {
    attendance_status: nextAttendanceStatus,
    updated_at: occurredAt,
  };
  if (eventType === "sign_in") {
    employeePatch.last_signed_in_at = occurredAt;
    if (!employee.registeredDeviceId && device.deviceId !== "unknown-device") {
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

  const { data: attendanceRow, error: attErr } = await admin
    .from("visitor_employee_attendance")
    .insert({
      employee_id: employee.id,
      owner_id: (row as EmployeeRow).owner_id,
      event_type: eventType,
      device_id: device.deviceId,
      device_label: device.deviceLabel,
      device_info: device.deviceInfo,
    })
    .select("id,employee_id,owner_id,event_type,device_id,device_label,device_info,created_at")
    .single();

  if (attErr) {
    return { ok: false, error: attErr.message, status: 500 };
  }

  mapAttendanceRow(attendanceRow as EmployeeAttendanceRow);

  const ownerId = String((row as EmployeeRow).owner_id);
  void notifyEmployeeAttendance(admin, {
    ownerId,
    employeeName: employee.fullName,
    department: employee.department,
    eventType,
    occurredAt,
    deviceLabel: device.deviceLabel,
  });

  const updatedEmployee: EmployeeRecord = {
    ...employee,
    attendanceStatus: nextAttendanceStatus,
    registeredDeviceId:
      employee.registeredDeviceId ??
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
  };
}
