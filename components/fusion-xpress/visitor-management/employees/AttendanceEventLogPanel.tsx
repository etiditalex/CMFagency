"use client";

import { Clock, Download } from "lucide-react";

import { memberTypeBadgeClass, memberTypeLabel } from "@/lib/employees/real-estate";
import {
  reportingWindowForMember,
  signInReportingStatus,
  signInStatusClass,
  signInStatusLabel,
  signOutReportingStatus,
  signOutStatusClass,
  signOutStatusLabel,
} from "@/lib/employees/reporting-time";
import type {
  EmployeeAttendanceRecord,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";
import { formatEmployeeReportTime } from "@/lib/employees/utils";
import { eatDatetimeLocalValue } from "@/lib/time/eat";

export type AttendanceEventLogPanelProps = {
  attendance: EmployeeAttendanceRecord[];
  employees: EmployeeRecord[];
  employeeNameById: Map<string, string>;
  reportingSettings: EmployeeReportingSettings;
  isRealEstate?: boolean;
  setupRequired?: boolean;
  exportingExcel?: boolean;
  onExportExcel?: () => void;
  onSaveAttendanceTime?: (attendanceId: string, createdAt: string) => Promise<void>;
  onError?: (message: string) => void;
  title?: string;
  emptyMessage?: string;
  className?: string;
};

export default function AttendanceEventLogPanel({
  attendance,
  employees,
  employeeNameById,
  reportingSettings,
  isRealEstate = false,
  setupRequired = false,
  exportingExcel = false,
  onExportExcel,
  onSaveAttendanceTime,
  onError,
  title = "Attendance log",
  emptyMessage = "No attendance events yet.",
  className = "",
}: AttendanceEventLogPanelProps) {
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  const handleEditTime = async (row: EmployeeAttendanceRecord) => {
    if (!onSaveAttendanceTime) return;
    const defaultLocal = eatDatetimeLocalValue(row.createdAt);
    const raw = window.prompt("Edit event date & time (EAT)", defaultLocal);
    if (!raw) return;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      onError?.("Invalid date or time.");
      return;
    }
    try {
      await onSaveAttendanceTime(row.id, parsed.toISOString());
    } catch (e: unknown) {
      onError?.(e instanceof Error ? e.message : "Could not update time");
    }
  };

  return (
    <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Clock className="w-4 h-4 text-gray-500" aria-hidden />
          {title}
        </span>
        {onExportExcel ? (
          <button
            type="button"
            disabled={setupRequired || exportingExcel || employees.length === 0}
            onClick={() => void onExportExcel()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            {exportingExcel ? "Exporting…" : "Download Excel"}
          </button>
        ) : null}
      </div>

      {attendance.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 text-center">{emptyMessage}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {attendance.map((row) => {
            const emp = employeeById.get(row.employeeId);
            const memberWindow = emp
              ? reportingWindowForMember(reportingSettings, emp.memberType)
              : null;
            const signInStatus =
              row.eventType === "sign_in" && memberWindow
                ? signInReportingStatus(row.createdAt, memberWindow)
                : null;
            const signOutStatus =
              row.eventType === "sign_out" && memberWindow
                ? signOutReportingStatus(row.createdAt, memberWindow.signOut)
                : null;

            return (
              <li
                key={row.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium text-gray-900 flex flex-wrap items-center gap-2 min-w-[140px]">
                  {employeeNameById.get(row.employeeId) ?? "Staff"}
                  {isRealEstate && emp ? (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${memberTypeBadgeClass(emp.memberType)}`}
                    >
                      {memberTypeLabel(emp.memberType)}
                    </span>
                  ) : null}
                  {signInStatus && signInStatus !== "unknown" ? (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${signInStatusClass(signInStatus)}`}
                    >
                      {signInStatusLabel(signInStatus)}
                    </span>
                  ) : null}
                  {signOutStatus && signOutStatus !== "unknown" ? (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${signOutStatusClass(signOutStatus)}`}
                    >
                      {signOutStatusLabel(signOutStatus)}
                    </span>
                  ) : null}
                </span>
                <span
                  className={
                    row.eventType === "sign_in"
                      ? signInStatus === "late"
                        ? "text-red-700 font-semibold"
                        : "text-emerald-700 font-semibold"
                      : "text-slate-600 font-semibold"
                  }
                >
                  {row.eventType === "sign_in" ? "Signed in" : "Signed out"}
                </span>
                <span className="text-gray-500 text-xs flex flex-wrap items-center gap-2 justify-end flex-1 min-w-[200px]">
                  {formatEmployeeReportTime(row.createdAt)}
                  {row.deviceLabel ? ` · ${row.deviceLabel}` : ""}
                  {onSaveAttendanceTime && !setupRequired ? (
                    <button
                      type="button"
                      className="font-semibold text-primary-700 hover:underline"
                      onClick={() => void handleEditTime(row)}
                    >
                      Edit time
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
