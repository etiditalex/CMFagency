"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Download,
  FileBarChart,
  Link2,
  LogIn,
  Plus,
  Printer,
  QrCode,
  ScanLine,
  Settings,
  Share2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import EmployeeQrCode from "@/components/fusion-xpress/visitor-management/employees/EmployeeQrCode";
import { downloadReceptionQrPdf } from "@/lib/employees/download-reception-qr-pdf";
import { isDayOnApprovedLeave } from "@/lib/employees/leave-rules";
import {
  formatReportingTime,
  reportingWindowForMember,
  signInReportingStatus,
  signInStatusClass,
  signInStatusLabel,
} from "@/lib/employees/reporting-time";
import { reportingWindowForEvent } from "@/lib/employees/shifts";
import type {
  EmployeeAttendanceRecord,
  EmployeeLeaveRecord,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";
import { eatDayKey, eatTodayDayKey } from "@/lib/time/eat";
import { pathWithOwner } from "@/lib/visitors/admin-business-scope-api";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH,
  VISITOR_MANAGEMENT_PATH,
} from "@/lib/visitors/industry-options";
import type { VisitorRecord } from "@/lib/visitors/types";
import { statusBadgeClass, statusLabel } from "@/lib/visitors/utils";
import { VM_CARD } from "@/components/fusion-xpress/visitor-management/vm-card";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLongDate(ymd: string) {
  const d = new Date(`${ymd}T12:00:00+03:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function formatClock(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Nairobi",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function printQrMarkup(title: string, svgMarkup: string) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; text-align: center; padding: 32px; color: #1a2332; }
      h1 { font-size: 18px; margin-bottom: 8px; }
      p { color: #64748b; font-size: 13px; }
      .qr { margin: 24px auto; display: inline-block; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; }
    </style></head><body>
    <h1>${title}</h1>
    <p>Fusion Xpress</p>
    <div class="qr">${svgMarkup}</div>
    <script>window.onload = function(){ window.print(); }<\/script>
    </body></html>`);
  w.document.close();
}

type OverviewProps = {
  title: string;
  subtitle: string;
  selectedDate: string;
  onDateChange: (ymd: string) => void;
  employees: EmployeeRecord[];
  attendance: EmployeeAttendanceRecord[];
  visitors: VisitorRecord[];
  leaveRecords: EmployeeLeaveRecord[];
  reportingSettings: EmployeeReportingSettings;
  gateToken: string | null;
  visitorPreRegisterUrl: string;
  organizationName: string;
  adminOwnerId: string | null;
  canDownloadQr: boolean;
  onAddEmployee: () => void;
  onRegisterGuest: () => void;
  showAddEmployee?: boolean;
};

export default function VisitorEmployeeOverview({
  title,
  subtitle,
  selectedDate,
  onDateChange,
  employees,
  attendance,
  visitors,
  leaveRecords,
  reportingSettings,
  gateToken,
  visitorPreRegisterUrl,
  organizationName,
  adminOwnerId,
  canDownloadQr,
  onAddEmployee,
  onRegisterGuest,
  showAddEmployee = true,
}: OverviewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrBusy, setQrBusy] = useState<"download" | "print" | null>(null);

  const employeeById = useMemo(() => {
    const m = new Map<string, EmployeeRecord>();
    for (const e of employees) m.set(e.id, e);
    return m;
  }, [employees]);

  const onLeaveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const leave of leaveRecords) {
      if (!isDayOnApprovedLeave(selectedDate, leave)) continue;
      ids.add(leave.employeeId);
    }
    return ids;
  }, [leaveRecords, selectedDate]);

  const firstSignInByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeAttendanceRecord>();
    for (const row of attendance) {
      if (row.eventType !== "sign_in") continue;
      if (eatDayKey(row.createdAt) !== selectedDate) continue;
      const prev = map.get(row.employeeId);
      if (!prev || Date.parse(row.createdAt) < Date.parse(prev.createdAt)) {
        map.set(row.employeeId, row);
      }
    }
    return map;
  }, [attendance, selectedDate]);

  const presentIds = useMemo(() => {
    const ids = new Set<string>();
    const viewingToday = selectedDate === eatTodayDayKey();
    for (const e of employees) {
      if (e.status !== "active") continue;
      if (onLeaveIds.has(e.id)) continue;
      if (firstSignInByEmployee.has(e.id)) {
        ids.add(e.id);
        continue;
      }
      if (e.lastSignedInAt && eatDayKey(e.lastSignedInAt) === selectedDate) {
        ids.add(e.id);
        continue;
      }
      if (viewingToday && e.attendanceStatus === "in") ids.add(e.id);
    }
    return ids;
  }, [employees, firstSignInByEmployee, onLeaveIds, selectedDate]);

  const lateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const id of presentIds) {
      const emp = employeeById.get(id);
      const signIn = firstSignInByEmployee.get(id);
      const at = signIn?.createdAt ?? emp?.lastSignedInAt;
      if (!emp || !at) continue;
      const window = reportingSettings.shiftEnabled
        ? reportingWindowForEvent(
            {
              createdAt: at,
              eventType: "sign_in",
              employeeId: emp.id,
              shiftNumber: signIn?.shiftNumber,
            },
            reportingSettings,
            emp.memberType
          )
        : reportingWindowForMember(reportingSettings, emp.memberType);
      if (signInReportingStatus(at, window) === "late") ids.add(id);
    }
    return ids;
  }, [employeeById, firstSignInByEmployee, presentIds, reportingSettings]);

  const visitorsToday = useMemo(
    () => visitors.filter((v) => v.visitDate === selectedDate),
    [selectedDate, visitors]
  );
  const employeeSignInsToday = attendance.filter(
    (r) => r.eventType === "sign_in" && eatDayKey(r.createdAt) === selectedDate
  ).length;
  const visitorCheckInsToday = visitorsToday.filter((v) => Boolean(v.checkedInAt) || v.status === "checked_in").length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const absentCount = Math.max(0, activeEmployees - presentIds.size - onLeaveIds.size);

  const statusSlices = [
    { label: "Present", count: Math.max(0, presentIds.size - lateIds.size), color: "#1e58ca" },
    { label: "Absent", count: absentCount, color: "#82a6c7" },
    { label: "On leave", count: onLeaveIds.size, color: "#2ca57c" },
    { label: "Late", count: lateIds.size, color: "#1a4ba8" },
  ];
  const statusTotal = statusSlices.reduce((acc, s) => acc + s.count, 0) || activeEmployees || 1;
  let conicCursor = 0;
  const conic = statusSlices
    .map((s) => {
      const start = conicCursor;
      const pct = (s.count / statusTotal) * 100;
      conicCursor += pct;
      return `${s.color} ${start}% ${conicCursor}%`;
    })
    .join(", ");

  const recentEmployeeCheckIns = useMemo(() => {
    const rows = attendance
      .filter((r) => r.eventType === "sign_in" && eatDayKey(r.createdAt) === selectedDate)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 6);
    const source = rows.length
      ? rows
      : attendance
          .filter((r) => r.eventType === "sign_in")
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, 6);
    return source.map((row) => {
      const emp = employeeById.get(row.employeeId);
      const window = emp
        ? reportingSettings.shiftEnabled
          ? reportingWindowForEvent(row, reportingSettings, emp.memberType)
          : reportingWindowForMember(reportingSettings, emp.memberType)
        : reportingWindowForMember(reportingSettings, "staff");
      const status = signInReportingStatus(row.createdAt, window);
      return { row, emp, status };
    });
  }, [attendance, employeeById, reportingSettings, selectedDate]);

  const recentVisitors = useMemo(
    () =>
      [...visitorsToday]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 6),
    [visitorsToday]
  );

  const staffWindow = reportingWindowForMember(reportingSettings, "staff");
  const workingHours = `${formatReportingTime(staffWindow.signInStart)} – ${formatReportingTime(staffWindow.signOut)}`;
  const gracePeriod = `${formatReportingTime(staffWindow.signInStart)} – ${formatReportingTime(staffWindow.signInLatest)}`;

  const kpiCards = [
    {
      label: "Total employees",
      value: employees.length,
      hint: `Active: ${activeEmployees}`,
      icon: Users,
      tone: "bg-primary-50 text-primary-700",
    },
    {
      label: "Present today",
      value: presentIds.size,
      hint: `Late: ${lateIds.size}`,
      icon: UserCheck,
      tone: "bg-secondary-50 text-secondary-700",
    },
    {
      label: "Visitors today",
      value: visitorsToday.length,
      hint: `Checked in: ${visitorCheckInsToday}`,
      icon: LogIn,
      tone: "bg-primary-100 text-primary-800",
    },
    {
      label: "Total check-ins",
      value: employeeSignInsToday + visitorCheckInsToday,
      hint: "Employees and visitors",
      icon: ScanLine,
      tone: "bg-secondary-50 text-secondary-800",
    },
  ];

  const copyVisitorLink = async () => {
    if (!visitorPreRegisterUrl) return;
    try {
      await navigator.clipboard.writeText(visitorPreRegisterUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleDownloadGate = async () => {
    if (!gateToken) return;
    setQrBusy("download");
    try {
      await downloadReceptionQrPdf({
        gateToken,
        memberType: "staff",
        organizationName,
      });
    } finally {
      setQrBusy(null);
    }
  };

  const handlePrintGate = () => {
    const svg = document.querySelector("#fx-employee-gate-qr svg");
    if (!svg) return;
    printQrMarkup("Employee reception QR", svg.outerHTML);
  };

  const handlePrintVisitor = () => {
    const svg = document.querySelector("#fx-visitor-prereg-qr svg");
    if (!svg) return;
    printQrMarkup("Visitor pre-registration QR", svg.outerHTML);
  };

  const employeesHref = pathWithOwner(VISITOR_MANAGEMENT_EMPLOYEES_PATH, adminOwnerId);
  const summaryHref = pathWithOwner(VISITOR_MANAGEMENT_EMPLOYEES_SUMMARY_PATH, adminOwnerId);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a2332] sm:text-[28px]">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{subtitle}</p>
        </div>
        <label className="relative inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-[0_8px_18px_rgba(15,47,100,0.08)] ring-1 ring-black/[0.03]">
          <CalendarDays className="h-4 w-4 text-primary-700" />
          <span>{formatLongDate(selectedDate)}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Dashboard date"
          />
        </label>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`${VM_CARD} p-5`}>
              <div className="flex items-center gap-4">
                <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-2xl font-bold tabular-nums text-[#1a2332]">{card.value.toLocaleString()}</div>
                  <div className="text-sm font-medium text-slate-600">{card.label}</div>
                  <div className="text-xs text-slate-500">{card.hint}</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className={`${VM_CARD} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <QrCode className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Employee QR code</h3>
              <p className="text-xs text-slate-500">Mount at reception for staff sign-in and sign-out.</p>
            </div>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div id="fx-employee-gate-qr" className="flex shrink-0 justify-center rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              {gateToken ? (
                <EmployeeQrCode token={gateToken} variant="gate" size={148} showCaption={false} />
              ) : (
                <div className="flex h-[148px] w-[148px] items-center justify-center text-center text-xs text-slate-500">
                  Reception QR not set up yet
                </div>
              )}
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
                Staff scan this code at the desk, then enter their member ID once to link a phone.
              </li>
              <li className="flex gap-2">
                <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
                After linking, each scan records sign-in or sign-out and emails directors.
              </li>
              <li className="flex gap-2">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" />
                Download or print the poster for the reception counter.
              </li>
            </ul>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!gateToken || !canDownloadQr || qrBusy === "download"}
              onClick={() => void handleDownloadGate()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {qrBusy === "download" ? "Creating PDF…" : "Download QR"}
            </button>
            <button
              type="button"
              disabled={!gateToken}
              onClick={handlePrintGate}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print QR
            </button>
          </div>
        </div>

        <div className={`${VM_CARD} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-50 text-secondary-700">
              <Link2 className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Visitor pre-registration</h3>
              <p className="text-xs text-slate-500">Guests register on their phone before arrival.</p>
            </div>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div id="fx-visitor-prereg-qr" className="flex shrink-0 justify-center rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              {visitorPreRegisterUrl ? (
                <QRCodeSVG value={visitorPreRegisterUrl} size={148} level="M" includeMargin />
              ) : (
                <div className="flex h-[148px] w-[148px] items-center justify-center text-center text-xs text-slate-500">
                  Link unavailable
                </div>
              )}
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                Share the industry form so guests pre-register from their own device.
              </li>
              <li className="flex gap-2">
                <ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                On arrival they scan the reception pass; the registered phone and contact verify the visit.
              </li>
              <li className="flex gap-2">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                Approved visitors appear in the register for check-in and check-out.
              </li>
            </ul>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!visitorPreRegisterUrl}
              onClick={() => void copyVisitorLink()}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              {copiedLink ? "Link copied" : "Share link"}
            </button>
            <button
              type="button"
              disabled={!visitorPreRegisterUrl}
              onClick={handlePrintVisitor}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print QR
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.9fr_1.15fr]">
        <div className={`${VM_CARD} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Recent employee check-ins</h3>
            <Link href={employeesHref} className="text-xs font-semibold text-primary-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f4f7fb] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Employee</th>
                  <th className="px-5 py-3">Check-in</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Location</th>
                </tr>
              </thead>
              <tbody>
                {recentEmployeeCheckIns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-slate-500">
                      No employee sign-ins for this date.
                    </td>
                  </tr>
                ) : (
                  recentEmployeeCheckIns.map(({ row, emp, status }) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-800">
                            {initials(emp?.fullName ?? "?")}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{emp?.fullName ?? "Staff"}</div>
                            <div className="truncate text-xs text-slate-500">
                              {emp?.jobTitle || emp?.department || "Employee"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-700">{formatClock(row.createdAt)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${signInStatusClass(status)}`}
                        >
                          {signInStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{row.deviceLabel || "Reception"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`${VM_CARD} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Employee status overview</h3>
            <Link href={summaryHref} className="text-xs font-semibold text-primary-700 hover:underline">
              View report
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative h-[132px] w-[132px] shrink-0">
              <div
                className="h-full w-full rounded-full"
                style={{ background: `conic-gradient(${conic || "#d1e8ef 0% 100%"})` }}
                role="img"
                aria-label="Employee status mix"
              />
              <div className="absolute inset-[28px] flex flex-col items-center justify-center rounded-full bg-white shadow-[0_0_0_1px_rgba(15,47,100,0.06)]">
                <div className="text-lg font-bold tabular-nums text-slate-900">{activeEmployees}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active</div>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2 text-xs">
              {statusSlices.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {s.count} · {statusTotal > 0 ? Math.round((s.count / statusTotal) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Working hours</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">{workingHours}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">On-time window</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">{gracePeriod}</div>
            </div>
          </div>
        </div>

        <div className={`${VM_CARD} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-900">Recent visitor registrations</h3>
            <Link href={VISITOR_MANAGEMENT_PATH} className="text-xs font-semibold text-primary-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f4f7fb] text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Visitor</th>
                  <th className="px-5 py-3">Purpose</th>
                  <th className="px-5 py-3">Check-in</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-slate-500">
                      No visitor registrations for this date.
                    </td>
                  </tr>
                ) : (
                  recentVisitors.map((v) => (
                    <tr key={v.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-3 font-semibold text-slate-900">{v.fullName}</td>
                      <td className="max-w-[8rem] truncate px-5 py-3 text-slate-600" title={v.purposeOfVisit}>
                        {v.purposeOfVisit || "Visit"}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-700">{formatClock(v.checkedInAt)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(v.status)}`}
                        >
                          {statusLabel(v.status, v.source)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={`${VM_CARD} flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center`}>
        <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
          <Settings className="h-4 w-4 text-primary-700" />
          Quick actions
        </div>
        <div className="flex flex-wrap gap-2 lg:ml-auto">
          {showAddEmployee ? (
            <button
              type="button"
              onClick={onAddEmployee}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Add employee
            </button>
          ) : null}
          <button
            type="button"
            onClick={onRegisterGuest}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" />
            Pre-register visitor
          </button>
          <a
            href="#visitor-register"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            View all visitors
          </a>
          <Link
            href={employeesHref}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <ClipboardList className="h-4 w-4" />
            Attendance logs
          </Link>
          <Link
            href={summaryHref}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            <FileBarChart className="h-4 w-4" />
            Generate report
          </Link>
        </div>
      </section>
    </div>
  );
}
