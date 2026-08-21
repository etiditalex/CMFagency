"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import SummaryReportExcelButton from "@/components/fusion-xpress/visitor-management/employees/SummaryReportExcelButton";

import {
  buildAttendanceDailyLogRows,
  type AttendanceDailyLogRow,
} from "@/lib/employees/attendance-daily-log";
import type { AttendanceSummaryEventRow } from "@/lib/employees/attendance-summary";
import type { EmployeeLeaveRecord, EmployeeRecord, EmployeeReportingSettings } from "@/lib/employees/types";
import { VISITOR_MANAGEMENT_EMPLOYEES_PATH } from "@/lib/visitors/industry-options";

const PAGE_SIZES = [10, 25, 50, 100] as const;

type SortKey =
  | "fullName"
  | "memberId"
  | "department"
  | "status"
  | "leaveType"
  | "signInLabel"
  | "signInDate"
  | "signInTime"
  | "signOutLabel"
  | "signOutTime"
  | "hoursWorked"
  | "sortKey";

type SortDir = "asc" | "desc";

function compareRows(a: AttendanceDailyLogRow, b: AttendanceDailyLogRow, key: SortKey): number {
  if (key === "sortKey") return a.sortKey.localeCompare(b.sortKey);
  const av = String(a[key] ?? "");
  const bv = String(b[key] ?? "");
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
}

type AttendanceReportLogTableProps = {
  events: AttendanceSummaryEventRow[];
  employees: EmployeeRecord[];
  reportingSettings?: EmployeeReportingSettings;
  leaveRecords?: EmployeeLeaveRecord[];
  from?: string;
  to?: string;
  title?: string;
  subtitle?: string;
  exportingExcel?: boolean;
  onExportExcel?: () => void;
  labelSignOutOvertime?: boolean;
};

function SortableHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  className = "",
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  className?: string;
}) {
  const active = sortKey === column;
  return (
    <th className={`px-4 py-3.5 text-left font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/90 hover:text-white"
      >
        {label}
        <span className="inline-flex flex-col text-white/40">
          <ChevronUp
            className={`w-3 h-3 -mb-1 ${active && sortDir === "asc" ? "text-white" : ""}`}
            aria-hidden
          />
          <ChevronDown
            className={`w-3 h-3 ${active && sortDir === "desc" ? "text-white" : ""}`}
            aria-hidden
          />
        </span>
      </button>
    </th>
  );
}

export default function AttendanceReportLogTable({
  events,
  employees,
  reportingSettings,
  leaveRecords = [],
  from,
  to,
  title = "Attendance log",
  subtitle,
  exportingExcel = false,
  onExportExcel,
  labelSignOutOvertime = false,
}: AttendanceReportLogTableProps) {
  const shiftEnabled = reportingSettings?.shiftEnabled === true;
  const allRows = useMemo(
    () =>
      buildAttendanceDailyLogRows(events, employees, reportingSettings, {
        leaveRecords,
        from,
        to,
        labelSignOutOvertime,
      }),
    [events, employees, reportingSettings, leaveRecords, from, to, labelSignOutOvertime]
  );

  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("sortKey");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (row) =>
        row.fullName.toLowerCase().includes(q) ||
        row.memberId.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const c = compareRows(a, b, sortKey);
      return sortDir === "asc" ? c : -c;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const someOnPageSelected = pageRows.some((r) => selected.has(r.id));

  const handleSort = (col: SortKey) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir(col === "sortKey" ? "desc" : "asc");
    }
    setPage(0);
  };

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const r of pageRows) next.delete(r.id);
      } else {
        for (const r of pageRows) next.add(r.id);
      }
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="overflow-hidden border border-[#e5e5e5] bg-white print:border-gray-300">
      <div className="border-b border-slate-200 px-4 py-3 print:hidden sm:px-5">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{title.toUpperCase()}</h2>
          {from && to ? (
            <p className="mt-1 text-xs font-semibold text-secondary-700">
              Detailed Attendance Report of {from} to {to}
            </p>
          ) : subtitle ? (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 print:hidden sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search employee by name/ID"
            className="min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(0);
            }}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
            <span className="text-slate-500">Rows Per Page</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Print
          </button>
          {onExportExcel ? (
            <SummaryReportExcelButton loading={exportingExcel} onClick={onExportExcel} />
          ) : null}
        </div>
        <p className="w-full text-xs text-slate-500">
          {sortedRows.length} record{sortedRows.length === 1 ? "" : "s"}
          {selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-secondary-800 bg-secondary-700">
              <th className="w-12 px-4 py-3.5 print:hidden">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected;
                  }}
                  onChange={toggleAllOnPage}
                  className="h-4 w-4 rounded border-white/40 bg-white/10 text-white focus:ring-white"
                  aria-label="Select all on this page"
                />
              </th>
              <SortableHeader
                label="Name"
                column="fullName"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Member ID"
                column="memberId"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Department"
                column="department"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Status"
                column="status"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Leave type"
                column="leaveType"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Sign in"
                column="signInLabel"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Date"
                column="signInDate"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Time"
                column="signInTime"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Sign out"
                column="signOutLabel"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Time"
                column="signOutTime"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              {shiftEnabled ? (
                <th className="px-4 py-3.5 text-left text-[11px] uppercase tracking-wide font-semibold text-white/90">
                  Shift
                </th>
              ) : null}
              <SortableHeader
                label="Hours worked"
                column="hoursWorked"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={shiftEnabled ? 13 : 12} className="px-4 py-12 text-center text-gray-500">
                  No attendance or leave recorded in this period.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100 hover:bg-primary-50/40 ${
                    row.status === "on_leave" ? "bg-amber-50/70" : "bg-white"
                  }`}
                >
                  <td className="px-4 py-4 print:hidden">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleRow(row.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      aria-label={`Select ${row.fullName}`}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Link
                      href={`${VISITOR_MANAGEMENT_EMPLOYEES_PATH}`}
                      className="font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                    >
                      {row.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap font-mono text-xs sm:text-sm">
                    {row.memberId}
                  </td>
                  <td className="px-4 py-4 text-gray-700">{row.department}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={
                        row.status === "on_leave"
                          ? "inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
                          : "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                      }
                    >
                      {row.status === "on_leave" ? "On leave" : "Present"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.leaveType}</td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.signInLabel}</td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.signInDate}</td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.signInTime}</td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.signOutLabel}</td>
                  <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.signOutTime}</td>
                  {shiftEnabled ? (
                    <td className="px-4 py-4 text-gray-700 whitespace-nowrap">{row.shiftLabel}</td>
                  ) : null}
                  <td className="px-4 py-4 text-gray-900 font-semibold whitespace-nowrap">
                    {row.hoursWorked}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sortedRows.length > pageSize ? (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 text-sm text-gray-600 print:hidden">
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

      <p className="hidden print:block px-4 py-2 text-xs text-gray-500 border-t border-gray-200">
        Times in East Africa Time (EAT)
      </p>
    </section>
  );
}
