"use client";

import { Clock, Download } from "lucide-react";
import { useMemo, useState } from "react";

import { VM_CARD } from "@/components/fusion-xpress/visitor-management/vm-card";
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
import { reportingWindowForEvent } from "@/lib/employees/shifts";
import type {
  EmployeeAttendanceRecord,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";
import { formatEmployeeReportTime } from "@/lib/employees/utils";
import { eatDatetimeLocalValue } from "@/lib/time/eat";

const PAGE_SIZES = [10, 25, 50, 100] as const;

function attendanceDeviceDisplay(row: EmployeeAttendanceRecord): string {
  const label = row.deviceLabel?.trim();
  if (label) return label;

  const userAgent = String(row.deviceInfo?.userAgent ?? "").trim();
  if (userAgent) {
    if (/Edg\//i.test(userAgent)) return "Microsoft Edge";
    if (/Chrome\//i.test(userAgent)) return "Chrome browser";
    if (/Firefox\//i.test(userAgent)) return "Firefox browser";
    if (/Safari\//i.test(userAgent)) return "Safari browser";
    return "Web browser";
  }

  const platform = String(row.deviceInfo?.platform ?? "").trim();
  if (platform) return platform;

  return "Unknown device";
}

function eventStatusForRow(
  row: EmployeeAttendanceRecord,
  reportingSettings: EmployeeReportingSettings,
  emp: EmployeeRecord | undefined,
  dayEvents: EmployeeAttendanceRecord[],
  labelSignOutOvertime: boolean
): { label: string; className: string } | null {
  if (!emp) return null;

  const memberWindow = reportingSettings.shiftEnabled
    ? reportingWindowForEvent(row, reportingSettings, emp.memberType, dayEvents)
    : reportingWindowForMember(reportingSettings, emp.memberType);

  if (row.eventType === "sign_in") {
    const status = signInReportingStatus(row.createdAt, memberWindow);
    if (status === "unknown") return null;
    return { label: signInStatusLabel(status), className: signInStatusClass(status) };
  }

  const status = signOutReportingStatus(row.createdAt, memberWindow.signOut, {
    labelOvertime: labelSignOutOvertime || reportingSettings.shiftEnabled,
  });
  if (status === "unknown") return null;
  return { label: signOutStatusLabel(status), className: signOutStatusClass(status) };
}

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
  /** Retail/hospitality: sign-out after required time shows as Overtime. */
  labelSignOutOvertime?: boolean;
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
  labelSignOutOvertime = false,
  title = "Attendance log",
  emptyMessage = "No attendance events yet.",
  className = "",
}: AttendanceEventLogPanelProps) {
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const eventsByEmployeeDay = useMemo(() => {
    const map = new Map<string, EmployeeAttendanceRecord[]>();
    for (const row of attendance) {
      const dayKey = row.createdAt.slice(0, 10);
      const key = `${row.employeeId}:${dayKey}`;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [attendance]);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(attendance.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => attendance.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [attendance, safePage, pageSize]
  );

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
    <div id="attendance-log" className={`${VM_CARD} overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Clock className="h-4 w-4 text-primary-700" aria-hidden />
          {title}
        </span>
        {onExportExcel ? (
          <button
            type="button"
            disabled={setupRequired || exportingExcel || employees.length === 0}
            onClick={() => void onExportExcel()}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            {exportingExcel ? "Exporting…" : "Download Excel"}
          </button>
        ) : null}
      </div>

      {attendance.length > 0 ? (
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
                setPage(0);
              }}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-gray-500">rows per page</span>
          </label>
          <p className="text-xs text-gray-500">
            {attendance.length} event{attendance.length === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}

      {attendance.length === 0 ? (
        <p className="p-6 text-sm text-gray-500 text-center">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#f4f7fb] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sign in / out</th>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Device / browser</th>
                {onSaveAttendanceTime ? (
                  <th className="px-5 py-3 text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const emp = employeeById.get(row.employeeId);
                const dayKey = row.createdAt.slice(0, 10);
                const dayEvents = eventsByEmployeeDay.get(`${row.employeeId}:${dayKey}`) ?? [row];
                const status = eventStatusForRow(
                  row,
                  reportingSettings,
                  emp,
                  dayEvents,
                  labelSignOutOvertime
                );
                const isSignIn = row.eventType === "sign_in";

                return (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {employeeNameById.get(row.employeeId) ?? "Staff"}
                        </span>
                        {isRealEstate && emp ? (
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${memberTypeBadgeClass(emp.memberType)}`}
                          >
                            {memberTypeLabel(emp.memberType)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      {status ? (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                      <span
                        className={
                          isSignIn
                            ? status?.label === "Late"
                              ? "font-semibold text-red-700"
                              : "font-semibold text-emerald-700"
                            : "font-semibold text-slate-600"
                        }
                      >
                        {isSignIn ? "Signed in" : "Signed out"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-middle whitespace-nowrap text-gray-700">
                      {formatEmployeeReportTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-gray-600">
                      {attendanceDeviceDisplay(row)}
                    </td>
                    {onSaveAttendanceTime ? (
                      <td className="px-4 py-3.5 align-middle text-right whitespace-nowrap">
                        {!setupRequired ? (
                          <button
                            type="button"
                            className="text-xs font-semibold text-primary-700 hover:underline"
                            onClick={() => void handleEditTime(row)}
                          >
                            Edit time
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {attendance.length > pageSize ? (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
          >
            Previous
          </button>
          <span>
            Page {safePage + 1} of {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
