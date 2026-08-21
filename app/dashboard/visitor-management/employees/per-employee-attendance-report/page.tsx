"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  Loader2,
  LogIn,
  LogOut,
  Printer,
  RefreshCw,
  UserRound,
} from "lucide-react";

import AttendanceReportLogTable from "@/components/fusion-xpress/visitor-management/employees/AttendanceReportLogTable";
import EmployeeSetupBanner from "@/components/fusion-xpress/visitor-management/employees/EmployeeSetupBanner";
import BusinessScopeBar, {
  AdminSelectBusinessPrompt,
} from "@/components/fusion-xpress/visitor-management/BusinessScopeBar";
import SummaryReportExcelButton from "@/components/fusion-xpress/visitor-management/employees/SummaryReportExcelButton";
import { useAuth } from "@/contexts/AuthContext";
import { usePortal } from "@/contexts/PortalContext";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import type { AttendanceSummaryPayload } from "@/lib/employees/attendance-summary";
import {
  downloadAttendanceRegisterExcel,
  downloadPerEmployeeSummaryExcel,
} from "@/lib/employees/summary-report-excel";
import {
  DEFAULT_REPORTING_SETTINGS,
  isMissingEmployeesTableMessage,
} from "@/lib/employees/db-mapper";
import { leaveStatusLabel, leaveTypeLabel } from "@/lib/employees/leave-rules";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import type {
  EmployeeLeaveRecord,
  EmployeeRecord,
  EmployeeReportingSettings,
} from "@/lib/employees/types";
import { formatEmployeeEmailDateTime } from "@/lib/employees/utils";
import { eatDayKey, eatTodayDayKey } from "@/lib/time/eat";
import { supabase } from "@/lib/supabase";
import {
  VISITOR_MANAGEMENT_EMPLOYEES_PATH,
  VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH,
} from "@/lib/visitors/industry-options";

type DurationPreset = "today" | "7d" | "30d" | "month" | "custom";

function todayIso(): string {
  return eatTodayDayKey();
}

function shiftEatDayKey(ymd: string, days: number): string {
  const anchor = new Date(`${ymd}T12:00:00+03:00`);
  anchor.setTime(anchor.getTime() + days * 86_400_000);
  return eatDayKey(anchor);
}

function presetRange(preset: DurationPreset): { from: string; to: string } {
  const to = todayIso();
  if (preset === "today") return { from: to, to };
  if (preset === "7d") return { from: shiftEatDayKey(to, -6), to };
  if (preset === "30d") return { from: shiftEatDayKey(to, -29), to };
  if (preset === "month") {
    const [y, m] = to.split("-");
    return { from: `${y}-${m}-01`, to };
  }
  return { from: shiftEatDayKey(to, -6), to };
}

const PRESET_BUTTONS: { id: DurationPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

export default function PerEmployeeAttendanceReportPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { isPortalMember, loading: portalLoading, hasFeature } = usePortal();
  const {
    needsSelection,
    appendOwnerQuery,
    businessName: scopedBusinessName,
  } = useAdminBusinessScope();

  const [preset, setPreset] = useState<DurationPreset>("30d");
  const initialRange = presetRange("30d");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [employeeId, setEmployeeId] = useState("");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryPayload | null>(null);
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [reportingSettings, setReportingSettings] = useState<EmployeeReportingSettings>(
    DEFAULT_REPORTING_SETTINGS
  );
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaveRecords, setLeaveRecords] = useState<EmployeeLeaveRecord[]>([]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId) ?? null,
    [employees, employeeId]
  );

  const employeeSummary = useMemo(
    () => summary?.employeeSummaries.find((row) => row.employeeId === employeeId) ?? null,
    [summary, employeeId]
  );

  const employeeLeave = useMemo(
    () => leaveRecords.filter((leave) => leave.employeeId === employeeId),
    [leaveRecords, employeeId]
  );

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  useEffect(() => {
    if (scopedBusinessName) {
      setOrganizationName(scopedBusinessName);
      return;
    }
    if (!user?.id) return;
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, unknown> | undefined;
      const name = String(meta?.business_name ?? meta?.businessName ?? "").trim();
      if (name) setOrganizationName(name);
    });
  }, [user?.id, scopedBusinessName]);

  const loadReportingSettings = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(appendOwnerQuery("/api/visitor-employees/reporting-settings"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        settings?: EmployeeReportingSettings;
      };
      if (res.ok && json.settings) setReportingSettings(json.settings);
    } catch {
      /* keep defaults */
    }
  }, [getToken, appendOwnerQuery]);

  const loadEmployees = useCallback(async () => {
    if (needsSelection) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(appendOwnerQuery("/api/visitor-employees"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        employees?: EmployeeRecord[];
        setupRequired?: boolean;
      };
      if (json.setupRequired) {
        setSetupRequired(true);
        return;
      }
      if (res.ok && Array.isArray(json.employees)) {
        setEmployees(json.employees);
        if (!employeeId && json.employees.length === 1) {
          setEmployeeId(json.employees[0].id);
        }
      }
    } catch {
      /* optional */
    }
  }, [getToken, needsSelection, appendOwnerQuery, employeeId]);

  const loadReport = useCallback(async () => {
    if (needsSelection || !employeeId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const qs = new URLSearchParams({ from, to, employeeId });
      const res = await fetch(appendOwnerQuery(`/api/visitor-employees/attendance-summary?${qs}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        summary?: AttendanceSummaryPayload;
        leave?: EmployeeLeaveRecord[];
        setupRequired?: boolean;
        error?: string;
      };
      if (json.setupRequired) {
        setSetupRequired(true);
        setSummary(null);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load report");
      if (json.summary) setSummary(json.summary);
      setLeaveRecords(Array.isArray(json.leave) ? json.leave : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load report";
      if (isMissingEmployeesTableMessage(msg)) {
        setSetupRequired(true);
      } else {
        setLoadError(msg);
      }
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, employeeId, getToken, needsSelection, appendOwnerQuery]);

  useEffect(() => {
    if (authLoading || portalLoading) return;
    if (!isAuthenticated || !user || !isPortalMember) {
      router.replace("/fusion-xpress/smart-visitor-management/sign-in");
      return;
    }
    if (!hasFeature("visitor_management")) {
      router.replace("/dashboard");
      return;
    }
    if (needsSelection) return;
    void loadEmployees();
    void loadReportingSettings();
  }, [
    authLoading,
    portalLoading,
    isAuthenticated,
    isPortalMember,
    hasFeature,
    needsSelection,
    router,
    user,
    loadEmployees,
    loadReportingSettings,
  ]);

  useEffect(() => {
    if (setupRequired || needsSelection || !employeeId) return;
    void loadReport();
  }, [setupRequired, needsSelection, employeeId, loadReport]);

  const exportMeta = useMemo(
    () => ({
      organizationName,
      from: summary?.from ?? from,
      to: summary?.to ?? to,
    }),
    [organizationName, summary?.from, summary?.to, from, to]
  );

  const rangeLabel = useMemo(() => {
    if (!summary) return `${from} – ${to}`;
    try {
      const a = format(new Date(summary.from), "d MMM yyyy");
      const b = format(new Date(summary.to), "d MMM yyyy");
      return a === b ? a : `${a} – ${b}`;
    } catch {
      return `${from} – ${to}`;
    }
  }, [summary, from, to]);

  const applyPreset = (id: DurationPreset) => {
    setPreset(id);
    if (id !== "custom") {
      const r = presetRange(id);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const handleExportSummary = async () => {
    if (!summary || !employeeSummary) return;
    setExporting(true);
    try {
      await downloadPerEmployeeSummaryExcel([employeeSummary], exportMeta);
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "Excel export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleExportRegister = async () => {
    if (!summary || !selectedEmployee) return;
    setExporting(true);
    try {
      await downloadAttendanceRegisterExcel(
        summary.events,
        [selectedEmployee],
        exportMeta,
        reportingSettings,
        employeeLeave
      );
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : "Excel export failed");
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || portalLoading) {
    return <p className="py-12 text-center text-sm text-gray-500">Loading attendance report…</p>;
  }

  return (
    <div className="w-full space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #per-employee-attendance-print,
          #per-employee-attendance-print * {
            visibility: visible;
          }
          #per-employee-attendance-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1a2332] pb-3 border-b border-[#e5e5e5]">
          <UserRound className="h-7 w-7 text-primary-600" />
          {scopedBusinessName ? `${scopedBusinessName} — Per employee attendance report` : "Per employee attendance report"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Detailed attendance and leave history for one employee. Times in EAT.
        </p>
        <p className="mt-2 text-sm">
          <Link
            href={VISITOR_MANAGEMENT_EMPLOYEES_PATH}
            className="font-semibold text-primary-700 hover:underline"
          >
            ← Employees
          </Link>
        </p>
      </div>

      <BusinessScopeBar basePath={VISITOR_MANAGEMENT_EMPLOYEES_PER_EMPLOYEE_REPORT_PATH} />
      {needsSelection ? <AdminSelectBusinessPrompt /> : null}
      {!needsSelection && setupRequired ? <EmployeeSetupBanner /> : null}

      {!needsSelection && !setupRequired ? (
        <>
          <section className="no-print space-y-4 border border-[#e5e5e5] bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {PRESET_BUTTONS.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => applyPreset(button.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                    preset === button.id
                      ? "border-primary-500 bg-primary-50 text-primary-900"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
              <label className="text-xs font-semibold text-gray-700">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setPreset("custom");
                    setFrom(e.target.value);
                  }}
                  className="mt-1 block w-full min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-700">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setPreset("custom");
                    setTo(e.target.value);
                  }}
                  className="mt-1 block w-full min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="min-w-[220px] flex-1 text-xs font-semibold text-gray-700">
                Employee
                <select
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading || !employeeId}
                  onClick={() => void loadReport()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Apply
                </button>
                <button
                  type="button"
                  disabled={!summary || !employeeId}
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  Print report
                </button>
              </div>
            </div>
          </section>

          {loadError ? (
            <p className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}
            </p>
          ) : null}
          {notice ? (
            <p className="no-print rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {notice}
            </p>
          ) : null}

          {!employeeId ? (
            <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
              Select an employee to view their attendance report.
            </p>
          ) : (
            <div id="per-employee-attendance-print" ref={printRef} className="space-y-6">
              {selectedEmployee ? (
                <section className="border border-[#e5e5e5] bg-white p-4 print:break-inside-avoid">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#1a2332]">{selectedEmployee.fullName}</h2>
                      <p className="text-sm text-gray-600">
                        {selectedEmployee.department || "No department"} ·{" "}
                        {memberTypeLabel(selectedEmployee.memberType)}
                      </p>
                      {selectedEmployee.employeeCode ? (
                        <p className="text-xs text-gray-500">Employee ID: {selectedEmployee.employeeCode}</p>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>Period: {rangeLabel}</p>
                      <p>Generated {summary?.generatedAtDisplay ?? formatEmployeeEmailDateTime(new Date().toISOString())}</p>
                    </div>
                  </div>
                </section>
              ) : null}

              {employeeSummary ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 no-print">
                  {[
                    { label: "Days attended", value: employeeSummary.daysAttended, icon: CalendarDays, tone: "bg-violet-50 border-violet-200 text-violet-900" },
                    { label: "Approved leave", value: employeeSummary.leaveDays, icon: BarChart3, tone: "bg-amber-50 border-amber-200 text-amber-900" },
                    { label: "Sign ins", value: employeeSummary.signInCount, icon: LogIn, tone: "bg-emerald-50 border-emerald-200 text-emerald-900" },
                    { label: "Sign outs", value: employeeSummary.signOutCount, icon: LogOut, tone: "bg-sky-50 border-sky-200 text-sky-900" },
                  ].map((card) => {
                    const Icon = card.icon;
                    return (
                      <div key={card.label} className={`rounded-xl border p-4 ${card.tone}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{card.label}</span>
                          <Icon className="h-4 w-4 opacity-70" />
                        </div>
                        <p className="mt-2 text-2xl font-extrabold">{card.value}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {employeeSummary ? (
                <section className="border border-[#e5e5e5] bg-white overflow-hidden print:break-inside-avoid">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e5e5e5] bg-white px-4 py-3">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Attendance summary</h2>
                      <p className="mt-0.5 text-xs text-gray-500">{rangeLabel}</p>
                    </div>
                    <SummaryReportExcelButton
                      disabled={!employeeSummary}
                      loading={exporting}
                      onClick={() => void handleExportSummary()}
                    />
                  </div>
                  <div className="grid gap-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500">First sign-in</p>
                      <p className="font-semibold text-gray-900">
                        {employeeSummary.firstSignIn
                          ? formatEmployeeEmailDateTime(employeeSummary.firstSignIn)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Last sign-out</p>
                      <p className="font-semibold text-gray-900">
                        {employeeSummary.lastSignOut
                          ? formatEmployeeEmailDateTime(employeeSummary.lastSignOut)
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Days attended</p>
                      <p className="font-semibold text-gray-900">{employeeSummary.daysAttended}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Approved leave days</p>
                      <p className="font-semibold text-gray-900">{employeeSummary.leaveDays}</p>
                    </div>
                  </div>
                </section>
              ) : null}

              {summary && selectedEmployee ? (
                <AttendanceReportLogTable
                  events={summary.events}
                  employees={[selectedEmployee]}
                  reportingSettings={reportingSettings}
                  leaveRecords={employeeLeave}
                  from={from}
                  to={to}
                  title={`Attendance register — ${selectedEmployee.fullName}`}
                  subtitle="Daily sign-in / sign-out and approved leave · times in EAT"
                  exportingExcel={exporting}
                  onExportExcel={() => void handleExportRegister()}
                  labelSignOutOvertime={reportingSettings.shiftEnabled}
                />
              ) : null}

              {employeeLeave.length > 0 ? (
                <section className="border border-[#e5e5e5] bg-white overflow-hidden print:break-inside-avoid">
                  <div className="border-b border-[#e5e5e5] bg-white px-4 py-3">
                    <h2 className="text-sm font-bold text-gray-900">Leave in this period</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                          <th className="px-4 py-2 font-semibold">Dates</th>
                          <th className="px-4 py-2 font-semibold">Type</th>
                          <th className="px-4 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeLeave.map((leave) => (
                          <tr key={leave.id} className="border-b border-gray-100">
                            <td className="px-4 py-2 text-gray-800">
                              {leave.startDate === leave.endDate
                                ? leave.startDate
                                : `${leave.startDate} → ${leave.endDate}`}
                            </td>
                            <td className="px-4 py-2 text-gray-700">{leaveTypeLabel(leave.leaveType)}</td>
                            <td className="px-4 py-2 text-gray-700">{leaveStatusLabel(leave.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              {loading ? (
                <p className="text-sm text-gray-500 py-8 text-center flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading report…
                </p>
              ) : null}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
