"use client";

import { useCallback, useEffect, useState } from "react";

import { isMissingEmployeesTableMessage } from "@/lib/employees/db-mapper";
import type { EmployeeAttendanceRecord, EmployeeFormInput, EmployeeRecord } from "@/lib/employees/types";
import { useAdminBusinessScope } from "@/lib/hooks/useAdminBusinessScope";
import { supabase } from "@/lib/supabase";

export function useVisitorEmployees() {
  const { needsSelection, appendOwnerQuery, isAdmin } = useAdminBusinessScope();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const reload = useCallback(async () => {
    if (isAdmin && needsSelection) {
      setEmployees([]);
      setAttendance([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSetupRequired(false);
    try {
      const token = await getToken();
      if (!token) {
        setEmployees([]);
        setAttendance([]);
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [empRes, attRes] = await Promise.all([
        fetch(appendOwnerQuery("/api/visitor-employees"), { headers, cache: "no-store" }),
        fetch(appendOwnerQuery("/api/visitor-employees/attendance?limit=500"), {
          headers,
          cache: "no-store",
        }),
      ]);
      const empJson = (await empRes.json().catch(() => ({}))) as {
        employees?: EmployeeRecord[];
        setupRequired?: boolean;
        message?: string;
        error?: string;
      };
      if (!empRes.ok) {
        const errMsg = empJson.error ?? "Failed to load employees";
        if (isMissingEmployeesTableMessage(errMsg) || empJson.setupRequired) {
          setSetupRequired(true);
          setEmployees([]);
          setError(empJson.message ?? errMsg);
          return;
        }
        throw new Error(errMsg);
      }
      if (empJson.setupRequired) {
        setSetupRequired(true);
        setEmployees([]);
        setError(empJson.message ?? null);
      } else {
        setEmployees(Array.isArray(empJson.employees) ? empJson.employees : []);
      }
      const attJson = (await attRes.json().catch(() => ({}))) as {
        attendance?: EmployeeAttendanceRecord[];
      };
      setAttendance(attRes.ok && Array.isArray(attJson.attendance) ? attJson.attendance : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load employees";
      if (isMissingEmployeesTableMessage(msg)) {
        setSetupRequired(true);
        setError(msg);
      } else {
        setError(msg);
      }
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [appendOwnerQuery, getToken, isAdmin, needsSelection]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addEmployee = useCallback(
    async (payload: EmployeeFormInput) => {
      const token = await getToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch(appendOwnerQuery("/api/visitor-employees"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to add employee");
      await reload();
    },
    [appendOwnerQuery, getToken, reload]
  );

  return {
    employees,
    attendance,
    loading,
    error,
    setupRequired,
    needsSelection,
    reload,
    addEmployee,
    getToken,
    appendOwnerQuery,
  };
}
