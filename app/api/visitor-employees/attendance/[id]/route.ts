import { NextRequest, NextResponse } from "next/server";

import { EMPLOYEE_ATTENDANCE_SELECT, isMissingEmployeesTable, mapAttendanceRow, type EmployeeAttendanceRow } from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

function parseIso(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const createdAt = parseIso(body.createdAt ?? body.created_at);
    if (!createdAt) {
      return NextResponse.json({ error: "Valid createdAt (ISO date/time) is required." }, { status: 400 });
    }

    let q = admin
      .from("visitor_employee_attendance")
      .update({ created_at: createdAt })
      .eq("id", id);
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q
      .select(EMPLOYEE_ATTENDANCE_SELECT)
      .maybeSingle();

    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_02_notification_admins.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Attendance record not found." }, { status: 404 });

    const attendance = mapAttendanceRow(data as EmployeeAttendanceRow);

    const { data: emp } = await admin
      .from("visitor_employees")
      .select("id,last_signed_in_at,last_signed_out_at,attendance_status")
      .eq("id", attendance.employeeId)
      .maybeSingle();

    if (emp) {
      const patch: Record<string, unknown> = {};
      if (attendance.eventType === "sign_in") {
        patch.last_signed_in_at = createdAt;
      } else {
        patch.last_signed_out_at = createdAt;
      }
      if (Object.keys(patch).length) {
        await admin.from("visitor_employees").update(patch).eq("id", attendance.employeeId);
      }
    }

    return NextResponse.json({ attendance });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
