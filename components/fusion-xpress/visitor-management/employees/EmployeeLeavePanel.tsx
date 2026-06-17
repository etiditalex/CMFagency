"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, RefreshCw, X } from "lucide-react";

import {
  countDaysInLeaveRange,
  EMPLOYEE_LEAVE_TYPES,
  leaveStatusLabel,
  leaveTypeLabel,
} from "@/lib/employees/leave-rules";
import { parseLeaveApplicationNotes } from "@/lib/employees/leave-signature";
import type {
  EmployeeLeaveRecord,
  EmployeeLeaveStatus,
  EmployeeLeaveType,
  EmployeeRecord,
} from "@/lib/employees/types";
import { eatTodayDayKey } from "@/lib/time/eat";
import { supabase } from "@/lib/supabase";

type EmployeeLeavePanelProps = {
  employees: EmployeeRecord[];
  disabled?: boolean;
  onLeaveChanged?: () => void;
  buildApiUrl?: (path: string) => string;
  realtimeOwnerId?: string;
};

function formatLeaveRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} → ${end}`;
}

function statusCellClass(status: EmployeeLeaveStatus): string {
  if (status === "approved") return "text-primary-800 font-semibold";
  if (status === "rejected") return "text-red-700 font-semibold";
  return "text-amber-800 font-semibold";
}

function resolveEmployeeByCode(
  employees: EmployeeRecord[],
  code: string
): EmployeeRecord | null {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  return (
    employees.find((e) => e.employeeCode?.trim().toLowerCase() === lower) ??
    employees.find((e) => e.id === trimmed) ??
    null
  );
}

function exportLeaveHistoryCsv(
  records: EmployeeLeaveRecord[],
  employeeById: Map<string, EmployeeRecord>,
  employeeName: string
) {
  const header = ["Employee ID", "Employee Name", "Start Date", "End Date", "Leave Type", "Days", "Status", "Reason"];
  const rows = records.map((r) => {
    const emp = employeeById.get(r.employeeId);
    const { text } = parseLeaveApplicationNotes(r.notes);
    const days = countDaysInLeaveRange(r.startDate, r.endDate);
    return [
      emp?.employeeCode ?? "",
      emp?.fullName ?? "",
      r.startDate,
      r.endDate,
      leaveTypeLabel(r.leaveType),
      String(days),
      leaveStatusLabel(r.status),
      text.replace(/"/g, '""'),
    ];
  });
  const csv = [header, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leave-history-${employeeName.replace(/\s+/g, "-").toLowerCase() || "employee"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EmployeeLeavePanel({
  employees,
  disabled,
  onLeaveChanged,
  buildApiUrl = (path) => path,
  realtimeOwnerId,
}: EmployeeLeavePanelProps) {
  const [leaveRecords, setLeaveRecords] = useState<EmployeeLeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [employeeCodeInput, setEmployeeCodeInput] = useState("");
  const [employeeNameDisplay, setEmployeeNameDisplay] = useState("");
  const [startDate, setStartDate] = useState(eatTodayDayKey());
  const [endDate, setEndDate] = useState(eatTodayDayKey());
  const [leaveType, setLeaveType] = useState<EmployeeLeaveType>("annual");
  const [notes, setNotes] = useState("");

  const activeEmployees = useMemo(
    () =>
      [...employees.filter((e) => e.status === "active")].sort((a, b) =>
        a.fullName.localeCompare(b.fullName)
      ),
    [employees]
  );

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const dayCount = useMemo(
    () => countDaysInLeaveRange(startDate, endDate),
    [startDate, endDate]
  );

  const employeeHistory = useMemo(() => {
    if (!employeeId) return [];
    return leaveRecords
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [leaveRecords, employeeId]);

  const pendingApplications = useMemo(
    () => leaveRecords.filter((r) => r.status === "pending"),
    [leaveRecords]
  );

  const syncEmployeeFields = useCallback((emp: EmployeeRecord | null) => {
    if (!emp) {
      setEmployeeId("");
      setEmployeeNameDisplay("");
      return;
    }
    setEmployeeId(emp.id);
    setEmployeeCodeInput(emp.employeeCode?.trim() ?? "");
    setEmployeeNameDisplay(emp.fullName);
  }, []);

  const populateFromLeaveRecord = useCallback(
    (record: EmployeeLeaveRecord) => {
      const emp = employeeById.get(record.employeeId);
      if (emp) syncEmployeeFields(emp);
      else {
        setEmployeeId(record.employeeId);
        setEmployeeCodeInput("");
        setEmployeeNameDisplay("Unknown employee");
      }
      setStartDate(record.startDate);
      setEndDate(record.endDate);
      setLeaveType(record.leaveType);
      const { text } = parseLeaveApplicationNotes(record.notes);
      setNotes(text);
    },
    [employeeById, syncEmployeeFields]
  );

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(buildApiUrl("/api/visitor-employees/leave"), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as {
        leave?: EmployeeLeaveRecord[];
        setupRequired?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load leave");
      if (json.setupRequired) {
        setSetupRequired(true);
        setLeaveRecords([]);
        return;
      }
      setLeaveRecords(Array.isArray(json.leave) ? json.leave : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load leave");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    const owner = (realtimeOwnerId ?? "").trim();
    if (!owner) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const queueRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void load();
      }, 350);
    };

    const channel = supabase
      .channel(`leave-realtime-${owner}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_employee_leave",
          filter: `owner_id=eq.${owner}`,
        },
        queueRefresh
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visitor_employees",
          filter: `owner_id=eq.${owner}`,
        },
        queueRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [load, realtimeOwnerId]);

  useEffect(() => {
    if (employeeId || pendingApplications.length === 0) return;
    const latestPending = [...pendingApplications].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
    )[0];
    if (latestPending) populateFromLeaveRecord(latestPending);
  }, [employeeId, pendingApplications, populateFromLeaveRecord]);

  const handleEmployeeCodeChange = (value: string) => {
    setEmployeeCodeInput(value);
    const match = resolveEmployeeByCode(activeEmployees, value);
    if (match) {
      setEmployeeId(match.id);
      setEmployeeNameDisplay(match.fullName);
    } else if (!value.trim()) {
      setEmployeeId("");
      setEmployeeNameDisplay("");
    }
  };

  const handleEmployeeCodeBlur = () => {
    const match = resolveEmployeeByCode(activeEmployees, employeeCodeInput);
    if (match) syncEmployeeFields(match);
    else if (employeeCodeInput.trim()) {
      setError("No employee found with this attendance ID. Check the ID from reception check-in.");
    }
  };

  const resetForm = () => {
    setEmployeeId("");
    setEmployeeCodeInput("");
    setEmployeeNameDisplay("");
    setStartDate(eatTodayDayKey());
    setEndDate(eatTodayDayKey());
    setLeaveType("annual");
    setNotes("");
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const match = resolveEmployeeByCode(activeEmployees, employeeCodeInput);
    const resolvedId = match?.id ?? employeeId;
    if (!resolvedId) {
      setError("Enter a valid employee attendance ID to mark leave.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(buildApiUrl("/api/visitor-employees/leave"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: resolvedId,
          startDate,
          endDate,
          leaveType,
          notes,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        leave?: EmployeeLeaveRecord;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Could not mark leave");
      if (json.leave) setLeaveRecords((prev) => [json.leave!, ...prev]);
      setNotice("Leave submitted successfully. Approve pending requests in the history table below.");
      setNotes("");
      onLeaveChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not mark leave");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setActingId(id);
    setError(null);
    setNotice(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(buildApiUrl(`/api/visitor-employees/leave/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        leave?: EmployeeLeaveRecord;
        notification?: { sent: boolean; reason?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      if (json.leave) {
        setLeaveRecords((prev) => prev.map((r) => (r.id === id ? json.leave! : r)));
        populateFromLeaveRecord(json.leave);
      }
      if (status === "approved") {
        const days = json.leave
          ? countDaysInLeaveRange(json.leave.startDate, json.leave.endDate)
          : 0;
        if (json.notification?.sent) {
          setNotice(`Leave approved. Employee notified — ${days} day${days === 1 ? "" : "s"} granted.`);
        } else {
          setNotice(`Leave approved for ${days} day${days === 1 ? "" : "s"}.`);
        }
      } else {
        setNotice("Leave request rejected.");
      }
      onLeaveChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActingId(null);
    }
  };

  const inputClass =
    "w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-400";
  const labelClass = "w-[9.5rem] shrink-0 pt-2 text-sm font-semibold text-white";

  return (
    <div className="space-y-6">
      {setupRequired ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Run <code className="text-xs font-mono">database/visitor_employees_patch_11_leave.sql</code> in
          Supabase to enable leave management.
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded border border-primary-300 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-900">
          {notice}
        </p>
      ) : null}

      <div className="relative rounded border-2 border-white/90 px-4 pb-5 pt-8 sm:px-6">
        <p className="absolute -top-3 left-4 bg-primary-600 px-2 text-base font-bold text-white">
          Mark Leave:
        </p>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className={labelClass}>Employee ID</span>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={employeeCodeInput}
                  onChange={(e) => handleEmployeeCodeChange(e.target.value)}
                  onBlur={handleEmployeeCodeBlur}
                  disabled={disabled || saving}
                  placeholder="Attendance / member ID"
                  list="leave-employee-codes"
                  className={inputClass}
                  required
                />
                <datalist id="leave-employee-codes">
                  {activeEmployees
                    .filter((e) => e.employeeCode?.trim())
                    .map((e) => (
                      <option key={e.id} value={e.employeeCode!.trim()}>
                        {e.fullName}
                      </option>
                    ))}
                </datalist>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Employee Name</span>
              <input
                type="text"
                value={employeeNameDisplay}
                readOnly
                disabled={disabled || saving}
                placeholder="Auto-filled from attendance ID"
                className={`${inputClass} bg-slate-50`}
              />
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Leave Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={disabled || saving}
                className={inputClass}
                required
              />
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Leave End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={disabled || saving}
                className={inputClass}
                required
              />
            </div>

            <div className="flex items-start gap-3">
              <span className={labelClass}>Leave Type</span>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as EmployeeLeaveType)}
                disabled={disabled || saving}
                className={inputClass}
              >
                {EMPLOYEE_LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {leaveTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <span className="text-sm font-semibold text-white">Reason</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={disabled || saving}
                rows={7}
                placeholder="Reason for leave…"
                className={`${inputClass} min-h-[140px] resize-y`}
                maxLength={500}
              />
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-white/90">Days</span>
                <p className="text-4xl font-extrabold leading-none text-white tabular-nums">
                  {dayCount}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={disabled || saving}
                  className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={disabled || saving || !employeeCodeInput.trim()}
                  className="min-w-[5.5rem] rounded border border-slate-300 bg-white px-5 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Leave History for Selected Employee</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              title="Refresh leave records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() =>
                exportLeaveHistoryCsv(employeeHistory, employeeById, employeeNameDisplay)
              }
              disabled={!employeeId || employeeHistory.length === 0}
              className="inline-flex items-center justify-center rounded border border-white/40 bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-40"
              title="Export leave history"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-[220px] overflow-hidden rounded border-2 border-white/60 bg-primary-50/95 shadow-inner">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-primary-800">Loading leave history…</p>
          ) : !employeeId ? (
            <p className="px-4 py-8 text-center text-sm text-primary-800">
              Enter an employee attendance ID above to view their leave history.
            </p>
          ) : employeeHistory.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-primary-800">
              No leave records for {employeeNameDisplay || "this employee"}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm text-slate-800">
                <thead>
                  <tr className="border-b border-primary-200 bg-primary-100/80 text-xs font-bold uppercase tracking-wide text-primary-900">
                    <th className="px-4 py-2.5">Start Date</th>
                    <th className="px-4 py-2.5">End Date</th>
                    <th className="px-4 py-2.5">Leave Type</th>
                    <th className="px-4 py-2.5 text-center">Days</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Reason</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {employeeHistory.map((record) => {
                    const days = countDaysInLeaveRange(record.startDate, record.endDate);
                    const { text } = parseLeaveApplicationNotes(record.notes);
                    const isPending = record.status === "pending";
                    return (
                      <tr
                        key={record.id}
                        className={`cursor-pointer transition hover:bg-primary-100/60 ${
                          isPending ? "bg-amber-50/90" : "bg-white/80"
                        }`}
                        onClick={() => populateFromLeaveRecord(record)}
                      >
                        <td className="px-4 py-2.5 font-medium">{record.startDate}</td>
                        <td className="px-4 py-2.5">{record.endDate}</td>
                        <td className="px-4 py-2.5">{leaveTypeLabel(record.leaveType)}</td>
                        <td className="px-4 py-2.5 text-center tabular-nums">{days}</td>
                        <td className={`px-4 py-2.5 ${statusCellClass(record.status)}`}>
                          {leaveStatusLabel(record.status)}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-600" title={text}>
                          {text || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div
                            className="flex flex-wrap justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void updateStatus(record.id, "approved")}
                                  disabled={disabled || actingId === record.id}
                                  className="inline-flex items-center gap-1 rounded border border-primary-400 bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-900 hover:bg-primary-200 disabled:opacity-60"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void updateStatus(record.id, "rejected")}
                                  disabled={disabled || actingId === record.id}
                                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pendingApplications.length > 0 ? (
          <p className="mt-2 text-xs text-white/85">
            {pendingApplications.length} pending application
            {pendingApplications.length === 1 ? "" : "s"} from employees — click a row to load details
            or approve below.
          </p>
        ) : null}
      </div>
    </div>
  );
}
