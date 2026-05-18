import type {
  EmployeeAttendanceRecord,
  EmployeeAttendanceStatus,
  EmployeeRecord,
  EmployeeStatus,
} from "@/lib/employees/types";

export type EmployeeRow = {
  id: string;
  owner_id: string;
  full_name: string;
  email: string | null;
  department: string | null;
  job_title: string | null;
  employee_code: string | null;
  qr_code_token: string | null;
  status: EmployeeStatus;
  attendance_status: EmployeeAttendanceStatus;
  registered_device_id: string | null;
  last_signed_in_at: string | null;
  last_signed_out_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EmployeeAttendanceRow = {
  id: string;
  employee_id: string;
  owner_id: string;
  event_type: "sign_in" | "sign_out";
  device_id: string | null;
  device_label: string | null;
  device_info: Record<string, unknown> | null;
  created_at: string;
};

export function mapEmployeeRow(row: EmployeeRow): EmployeeRecord {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    department: row.department ?? "",
    jobTitle: row.job_title ?? "",
    employeeCode: row.employee_code,
    qrCodeToken: row.qr_code_token,
    status: row.status,
    attendanceStatus: row.attendance_status,
    registeredDeviceId: row.registered_device_id,
    lastSignedInAt: row.last_signed_in_at,
    lastSignedOutAt: row.last_signed_out_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttendanceRow(row: EmployeeAttendanceRow): EmployeeAttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    eventType: row.event_type,
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    deviceInfo:
      row.device_info && typeof row.device_info === "object" && !Array.isArray(row.device_info)
        ? (row.device_info as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  };
}

export function isMissingEmployeesTable(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? "");
  const code = String((err as { code?: string })?.code ?? "");
  return (
    code === "42P01" ||
    (msg.includes("visitor_employees") && msg.includes("does not exist")) ||
    msg.includes("visitor_employees_patch")
  );
}
