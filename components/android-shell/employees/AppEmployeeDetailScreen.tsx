"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import AndroidShellFrame from "@/components/android-shell/AndroidShellFrame";
import EmployeeQrCode from "@/components/fusion-xpress/visitor-management/employees/EmployeeQrCode";
import FxCard from "@/components/fusion-xpress/app-ui/FxCard";
import TopBar from "@/components/fusion-xpress/app-ui/TopBar";
import { ANDROID_SHELL_EMPLOYEES_PATH } from "@/lib/android-shell";
import { leaveStatusLabel, leaveTypeLabel } from "@/lib/employees/leave-rules";
import type { EmployeeAttendanceRecord, EmployeeLeaveRecord } from "@/lib/employees/types";
import {
  employeeAttendanceLabel,
  formatEmployeeTimestamp,
} from "@/lib/employees/utils";
import { useVisitorEmployees } from "@/lib/hooks/useVisitorEmployees";

export default function AppEmployeeDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const { employees, attendance, loading, getToken, appendOwnerQuery } = useVisitorEmployees();
  const [leave, setLeave] = useState<EmployeeLeaveRecord[]>([]);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const employee = useMemo(
    () => employees.find((row) => row.id === id) ?? null,
    [employees, id]
  );

  const events = useMemo(
    () => attendance.filter((row) => row.employeeId === id).slice(0, 20),
    [attendance, id]
  );

  const loadLeave = useCallback(async () => {
    const token = await getToken();
    if (!token || !id) return;
    const res = await fetch(
      appendOwnerQuery(`/api/visitor-employees/leave?employeeId=${encodeURIComponent(id)}`),
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const json = (await res.json().catch(() => ({}))) as {
      leave?: EmployeeLeaveRecord[];
      error?: string;
    };
    if (!res.ok) {
      setLeaveError(json.error ?? "Could not load leave");
      setLeave([]);
      return;
    }
    setLeaveError(null);
    setLeave(Array.isArray(json.leave) ? json.leave : []);
  }, [appendOwnerQuery, getToken, id]);

  useEffect(() => {
    void loadLeave();
  }, [loadLeave]);

  const patchLeave = async (leaveId: string, status: "approved" | "rejected") => {
    const token = await getToken();
    if (!token) return;
    setActingId(leaveId);
    try {
      const res = await fetch(
        appendOwnerQuery(`/api/visitor-employees/leave/${encodeURIComponent(leaveId)}`),
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await loadLeave();
    } catch {
      setLeaveError("Could not update leave.");
    } finally {
      setActingId(null);
    }
  };

  if (loading && !employee) {
    return (
      <AndroidShellFrame nav>
        <TopBar title="Employee" />
        <p className="px-5 pt-8 text-center text-[13px] text-fx-muted">Loading…</p>
      </AndroidShellFrame>
    );
  }

  if (!employee) {
    return (
      <AndroidShellFrame nav>
        <TopBar title="Employee" />
        <p className="px-5 pt-8 text-center text-[13px] text-fx-muted">Employee not found.</p>
        <Link
          href={ANDROID_SHELL_EMPLOYEES_PATH}
          className="mt-4 block text-center text-[13px] font-semibold text-fx-accent"
        >
          Back to roster
        </Link>
      </AndroidShellFrame>
    );
  }

  return (
    <AndroidShellFrame nav>
      <TopBar
        title={employee.fullName}
        subtitle={employee.jobTitle || employee.department || "Staff"}
      />

      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-6">
        <Link
          href={ANDROID_SHELL_EMPLOYEES_PATH}
          className="-mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-fx-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Roster
        </Link>
        <FxCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] text-fx-muted">{employee.employeeCode || "No member ID"}</p>
              <p className="mt-1 text-[15px] font-semibold text-fx-ink">
                {employeeAttendanceLabel(employee.attendanceStatus)}
              </p>
              <p className="mt-1 text-[12px] text-fx-muted">
                Last in {formatEmployeeTimestamp(employee.lastSignedInAt)} · out{" "}
                {formatEmployeeTimestamp(employee.lastSignedOutAt)}
              </p>
            </div>
            {employee.qrCodeToken ? (
              <EmployeeQrCode token={employee.qrCodeToken} size={88} employeeName="" />
            ) : null}
          </div>
        </FxCard>

        <section>
          <h2 className="mb-2 text-[16px] font-bold text-fx-ink">Attendance</h2>
          <FxCard padded={false} className="divide-y divide-black/[0.04]">
            {events.length === 0 ? (
              <p className="px-4 py-5 text-[13px] text-fx-muted">No recent scans.</p>
            ) : (
              events.map((event: EmployeeAttendanceRecord) => (
                <div key={event.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-[14px] font-semibold capitalize text-fx-ink">
                    {event.eventType.replace("_", " ")}
                  </span>
                  <span className="text-[12px] text-fx-muted">
                    {formatEmployeeTimestamp(event.createdAt)}
                    {event.deviceLabel ? ` · ${event.deviceLabel}` : ""}
                  </span>
                </div>
              ))
            )}
          </FxCard>
        </section>

        <section>
          <h2 className="mb-2 text-[16px] font-bold text-fx-ink">Leave</h2>
          {leaveError ? <p className="mb-2 text-[12px] text-red-500">{leaveError}</p> : null}
          <FxCard padded={false} className="divide-y divide-black/[0.04]">
            {leave.length === 0 ? (
              <p className="px-4 py-5 text-[13px] text-fx-muted">No leave records.</p>
            ) : (
              leave.map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-semibold text-fx-ink">
                        {leaveTypeLabel(row.leaveType)}
                      </p>
                      <p className="text-[12px] text-fx-muted">
                        {row.startDate} → {row.endDate}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-fx-muted">
                      {leaveStatusLabel(row.status)}
                    </span>
                  </div>
                  {row.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={actingId === row.id}
                        onClick={() => void patchLeave(row.id, "approved")}
                        className="rounded-full bg-fx-successBg px-3 py-1 text-[12px] font-semibold text-fx-success"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actingId === row.id}
                        onClick={() => void patchLeave(row.id, "rejected")}
                        className="rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-500"
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </FxCard>
        </section>
      </div>
    </AndroidShellFrame>
  );
}
