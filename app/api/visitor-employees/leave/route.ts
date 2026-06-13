import { NextRequest, NextResponse } from "next/server";

import {
  isMissingEmployeesTable,
  isMissingLeaveTable,
  mapLeaveRow,
  type EmployeeLeaveRow,
} from "@/lib/employees/db-mapper";
import { isValidLeaveDate, parseLeaveType } from "@/lib/employees/leave-rules";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";

const LEAVE_SELECT =
  "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at";

function safeText(v: unknown, max: number): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner")
    );
    if (!scope.ok) {
      return adminOwnerScopeErrorResponse(scope)!;
    }
    const ownerId = scope.ownerId;

    const from = req.nextUrl.searchParams.get("from")?.trim() ?? "";
    const to = req.nextUrl.searchParams.get("to")?.trim() ?? "";
    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";
    const status = req.nextUrl.searchParams.get("status")?.trim() ?? "";

    let q = admin.from("visitor_employee_leave").select(LEAVE_SELECT).order("start_date", { ascending: false });

    q = q.eq("owner_id", ownerId);
    if (employeeId) q = q.eq("employee_id", employeeId);
    if (status === "pending" || status === "approved" || status === "rejected") {
      q = q.eq("status", status);
    }
    if (from && isValidLeaveDate(from)) q = q.gte("end_date", from);
    if (to && isValidLeaveDate(to)) q = q.lte("start_date", to);

    const { data, error } = await q;
    if (error) {
      if (isMissingLeaveTable(error) || isMissingEmployeesTable(error)) {
        return NextResponse.json({ leave: [], setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      leave: ((data ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner")
    );
    if (!scope.ok) {
      return adminOwnerScopeErrorResponse(scope)!;
    }
    const ownerId = scope.ownerId;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = safeText(body.employeeId ?? body.employee_id, 80);
    const startDate = safeText(body.startDate ?? body.start_date, 10);
    const endDate = safeText(body.endDate ?? body.end_date, 10);
    const leaveType = parseLeaveType(body.leaveType ?? body.leave_type);
    const notes = safeText(body.notes, 500);

    if (!employeeId) {
      return NextResponse.json({ error: "Select an employee." }, { status: 400 });
    }
    if (!isValidLeaveDate(startDate) || !isValidLeaveDate(endDate)) {
      return NextResponse.json({ error: "Use valid start and end dates (YYYY-MM-DD)." }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "End date must be on or after start date." }, { status: 400 });
    }

    const { data: empRow, error: empErr } = await admin
      .from("visitor_employees")
      .select("id,full_name,email")
      .eq("id", employeeId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (empErr) {
      if (isMissingEmployeesTable(empErr)) {
        return NextResponse.json({ error: "Employee module not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }
    if (!empRow) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const { data, error } = await admin
      .from("visitor_employee_leave")
      .insert({
        owner_id: ownerId,
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        status: "pending",
        notes,
      })
      .select(LEAVE_SELECT)
      .single();

    if (error) {
      if (isMissingLeaveTable(error)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_11_leave.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leave: mapLeaveRow(data as EmployeeLeaveRow) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
