"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Save, Settings2 } from "lucide-react";

import type { EmployeeLeaveAllocationView } from "@/lib/employees/leave-balance";
import { currentLeaveYear } from "@/lib/employees/leave-balance";
import { leaveTypeLabel } from "@/lib/employees/leave-rules";
import type { EmployeeLeaveType } from "@/lib/employees/types";
import { supabase } from "@/lib/supabase";

type DraftRow = {
  annualDays: string;
  sickDays: string;
  compassionateDays: string;
  unpaidDays: string;
  otherDays: string;
};

type LeaveAllocationSettingsPanelProps = {
  disabled?: boolean;
  buildApiUrl?: (path: string) => string;
};

const LEAVE_TYPES: EmployeeLeaveType[] = ["annual", "sick", "compassionate", "unpaid", "other"];

function draftFromRow(row: EmployeeLeaveAllocationView): DraftRow {
  return {
    annualDays: String(row.allocation.annualDays),
    sickDays: String(row.allocation.sickDays),
    compassionateDays: String(row.allocation.compassionateDays),
    unpaidDays: row.allocation.unpaidDays == null ? "" : String(row.allocation.unpaidDays),
    otherDays: String(row.allocation.otherDays),
  };
}

function formatRemaining(remaining: number | null): string {
  if (remaining === null) return "Unlimited";
  return `${remaining}`;
}

export default function LeaveAllocationSettingsPanel({
  disabled,
  buildApiUrl = (path) => path,
}: LeaveAllocationSettingsPanelProps) {
  const [leaveYear, setLeaveYear] = useState(currentLeaveYear());
  const [rows, setRows] = useState<EmployeeLeaveAllocationView[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(
        buildApiUrl(`/api/visitor-employees/leave-allocations?year=${leaveYear}`),
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      const json = (await res.json().catch(() => ({}))) as {
        allocations?: EmployeeLeaveAllocationView[];
        setupRequired?: boolean;
        error?: string;
      };
      if (json.setupRequired) {
        setSetupRequired(true);
        setRows([]);
        setDrafts({});
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Failed to load leave settings");
      const nextRows = Array.isArray(json.allocations) ? json.allocations : [];
      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map((row) => [row.employeeId, draftFromRow(row)])));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load leave settings");
      setRows([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, getToken, leaveYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const yearOptions = useMemo(() => {
    const current = currentLeaveYear();
    return [current - 1, current, current + 1];
  }, []);

  const updateDraft = (employeeId: string, field: keyof DraftRow, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] ?? {
          annualDays: "21",
          sickDays: "14",
          compassionateDays: "5",
          unpaidDays: "",
          otherDays: "0",
        }),
        [field]: value,
      },
    }));
  };

  const saveRow = async (row: EmployeeLeaveAllocationView) => {
    const draft = drafts[row.employeeId];
    if (!draft) return;
    setSavingId(row.employeeId);
    setNotice(null);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(buildApiUrl("/api/visitor-employees/leave-allocations"), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: row.employeeId,
          leaveYear,
          annualDays: draft.annualDays,
          sickDays: draft.sickDays,
          compassionateDays: draft.compassionateDays,
          unpaidDays: draft.unpaidDays.trim() === "" ? null : draft.unpaidDays,
          otherDays: draft.otherDays,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        allocation?: EmployeeLeaveAllocationView["allocation"];
        balances?: EmployeeLeaveAllocationView["balances"];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to save leave allocation");
      setRows((prev) =>
        prev.map((item) =>
          item.employeeId === row.employeeId
            ? {
                ...item,
                allocation: json.allocation ?? item.allocation,
                balances: json.balances ?? item.balances,
              }
            : item
        )
      );
      setNotice(`Saved leave allocation for ${row.fullName}.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save leave allocation");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-white/90">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading leave day settings…
      </p>
    );
  }

  if (setupRequired) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Run <code className="font-mono text-xs">database/visitor_employees_patch_16_leave_allocations.sql</code>{" "}
        in Supabase to enable per-employee leave day settings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <Settings2 className="h-5 w-5" />
            Leave day settings
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-white/85">
            Set how many leave days each employee can take per year. When leave is approved, the
            system deducts the days and recalculates the remaining balance automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-white/90">
            Leave year
            <select
              value={leaveYear}
              disabled={disabled}
              onChange={(e) => setLeaveYear(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year} className="text-gray-900">
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/15 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-white/15 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3 font-semibold">Employee</th>
                {LEAVE_TYPES.map((type) => (
                  <th key={type} className="px-3 py-3 font-semibold whitespace-nowrap">
                    {leaveTypeLabel(type)}
                    <span className="mt-0.5 block text-[10px] font-medium normal-case text-gray-400">
                      Alloc / Used / Left
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No employees found. Add employees first.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const draft = drafts[row.employeeId] ?? draftFromRow(row);
                  return (
                    <tr key={row.employeeId} className="border-b border-gray-100 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{row.fullName}</p>
                        <p className="text-xs text-gray-500">{row.department || "—"}</p>
                        {row.employeeCode ? (
                          <p className="text-xs text-gray-400">ID: {row.employeeCode}</p>
                        ) : null}
                      </td>
                      {LEAVE_TYPES.map((type) => {
                        const balance = row.balances[type];
                        const field =
                          type === "annual"
                            ? "annualDays"
                            : type === "sick"
                              ? "sickDays"
                              : type === "compassionate"
                                ? "compassionateDays"
                                : type === "unpaid"
                                  ? "unpaidDays"
                                  : "otherDays";
                        return (
                          <td key={type} className="px-3 py-3">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              disabled={disabled || savingId === row.employeeId}
                              value={draft[field]}
                              onChange={(e) => updateDraft(row.employeeId, field, e.target.value)}
                              placeholder={type === "unpaid" ? "Unlimited" : "0"}
                              className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                              {balance.allocated == null ? "∞" : balance.allocated} / {balance.used} /{" "}
                              <span className="font-semibold text-primary-700">
                                {formatRemaining(balance.remaining)}
                              </span>
                            </p>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={disabled || savingId === row.employeeId}
                          onClick={() => void saveRow(row)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-700 px-3 py-2 text-xs font-bold text-white hover:bg-primary-800 disabled:opacity-60"
                        >
                          {savingId === row.employeeId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-white/75">
        Leave blank for unpaid leave to keep it unlimited. Balances update when leave requests are
        approved, rejected, or removed.
      </p>
    </div>
  );
}
