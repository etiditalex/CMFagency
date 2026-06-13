"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Check, Plus, Trash2, X } from "lucide-react";

import {
  countDaysInLeaveRange,
  EMPLOYEE_LEAVE_TYPES,
  leaveStatusLabel,
  leaveTypeLabel,
} from "@/lib/employees/leave-rules";
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
};

type StatusFilter = "all" | EmployeeLeaveStatus;

function formatLeaveRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} → ${end}`;
}

function statusBadgeClass(status: EmployeeLeaveStatus): string {
  if (status === "approved") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (status === "rejected") return "bg-red-100 text-red-900 border-red-200";
  return "bg-amber-100 text-amber-900 border-amber-200";
}

export default function EmployeeLeavePanel({
  employees,
  disabled,
  onLeaveChanged,
  buildApiUrl = (path) => path,
}: EmployeeLeavePanelProps) {
  const [leaveRecords, setLeaveRecords] = useState<EmployeeLeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [employeeId, setEmployeeId] = useState("");
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

  const filteredRecords = useMemo(() => {
    if (statusFilter === "all") return leaveRecords;
    return leaveRecords.filter((r) => r.status === statusFilter);
  }, [leaveRecords, statusFilter]);

  const pendingCount = useMemo(
    () => leaveRecords.filter((r) => r.status === "pending").length,
    [leaveRecords]
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
  }, [getToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!employeeId && activeEmployees.length > 0) {
      setEmployeeId(activeEmployees[0].id);
    }
  }, [activeEmployees, employeeId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
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
          employeeId,
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
      if (!res.ok) throw new Error(json.error ?? "Could not assign leave");
      if (json.leave) setLeaveRecords((prev) => [json.leave!, ...prev]);
      setNotes("");
      setStartDate(eatTodayDayKey());
      setEndDate(eatTodayDayKey());
      setNotice("Leave assigned as pending — approve it to notify the employee and show it in the register.");
      onLeaveChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not assign leave");
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
      }
      if (status === "approved") {
        const days = json.leave
          ? countDaysInLeaveRange(json.leave.startDate, json.leave.endDate)
          : 0;
        if (json.notification?.sent) {
          setNotice(`Leave approved. The employee was emailed that ${days} day${days === 1 ? "" : "s"} have been granted.`);
        } else {
          setNotice(
            `Leave approved for the register, but no email was sent${json.notification?.reason ? `: ${json.notification.reason}` : "."} Add the employee's email on their profile to notify them.`
          );
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

  const handleRemove = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(buildApiUrl(`/api/visitor-employees/leave/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Could not remove leave");
      }
      setLeaveRecords((prev) => prev.filter((l) => l.id !== id));
      onLeaveChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not remove leave");
    } finally {
      setActingId(null);
    }
  };

  const FILTER_BUTTONS: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: `Pending${pendingCount ? ` (${pendingCount})` : ""}` },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <CalendarOff className="w-5 h-5 text-primary-600" aria-hidden />
        <div>
          <h2 className="text-sm font-bold text-gray-900">Employee leave</h2>
          <p className="text-xs text-gray-500 mt-0.5">Assign and approve leave. Approved leave appears in reports.</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {setupRequired ? (
          <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Run <code className="text-xs">database/visitor_employees_patch_11_leave.sql</code> (and patch 12 if
            needed) in Supabase to enable leave management.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-800 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
        ) : null}
        {notice ? (
          <p className="text-sm text-emerald-900 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            {notice}
          </p>
        ) : null}

        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="block sm:col-span-2 lg:col-span-2">
            <span className="text-xs font-semibold text-gray-600">Employee</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={disabled || saving || activeEmployees.length === 0}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            >
              {activeEmployees.length === 0 ? (
                <option value="">No active employees</option>
              ) : (
                activeEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                    {emp.employeeCode ? ` (${emp.employeeCode})` : ""}
                    {!emp.email?.trim() ? " · no email" : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={disabled || saving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={disabled || saving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Type</span>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as EmployeeLeaveType)}
              disabled={disabled || saving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {EMPLOYEE_LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {leaveTypeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={disabled || saving || !employeeId || activeEmployees.length === 0}
              className="inline-flex w-full min-h-[42px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-bold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              <Plus className="w-4 h-4" aria-hidden />
              {saving ? "Saving…" : "Assign leave"}
            </button>
          </div>
          <label className="block sm:col-span-2 lg:col-span-6">
            <span className="text-xs font-semibold text-gray-600">Notes (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={disabled || saving}
              placeholder="e.g. Family travel, medical certificate on file"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              maxLength={500}
            />
          </label>
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setStatusFilter(btn.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                statusFilter === btn.id
                  ? "border-primary-300 bg-primary-50 text-primary-900"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading leave records…</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-sm text-gray-500">No leave records in this view.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {filteredRecords.map((record) => {
              const emp = employeeById.get(record.employeeId);
              const dayCount = countDaysInLeaveRange(record.startDate, record.endDate);
              return (
                <li
                  key={record.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {emp?.fullName ?? "Unknown employee"}
                      </p>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(record.status)}`}
                      >
                        {leaveStatusLabel(record.status)}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-0.5">
                      {formatLeaveRange(record.startDate, record.endDate)} ·{" "}
                      <span className="font-medium">{leaveTypeLabel(record.leaveType)}</span> ·{" "}
                      {dayCount} day{dayCount === 1 ? "" : "s"}
                    </p>
                    {record.notes.trim() ? (
                      <p className="text-xs text-gray-500 mt-0.5">{record.notes.trim()}</p>
                    ) : null}
                    {record.status === "approved" && record.notificationSentAt ? (
                      <p className="text-xs text-emerald-700 mt-1">Employee notified by email.</p>
                    ) : null}
                    {record.status === "pending" && !emp?.email?.trim() ? (
                      <p className="text-xs text-amber-700 mt-1">
                        Add an email on the employee profile before approving so they can be notified.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {record.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateStatus(record.id, "approved")}
                          disabled={disabled || actingId === record.id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateStatus(record.id, "rejected")}
                          disabled={disabled || actingId === record.id}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden />
                          Reject
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleRemove(record.id)}
                      disabled={disabled || actingId === record.id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
