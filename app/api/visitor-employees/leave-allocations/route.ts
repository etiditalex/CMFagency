import { NextRequest, NextResponse } from "next/server";

import {
  isMissingEmployeesTable,
  isMissingLeaveAllocationsTable,
  isMissingLeaveTable,
  mapEmployeeRow,
  mapLeaveAllocationRow,
  mapLeaveRow,
  type EmployeeLeaveAllocationRow,
  type EmployeeLeaveRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import {
  buildEmployeeLeaveBalances,
  currentLeaveYear,
  normalizeAllocationInput,
  type EmployeeLeaveAllocationView,
} from "@/lib/employees/leave-balance";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";

const ALLOCATION_SELECT =
  "id,owner_id,employee_id,leave_year,annual_days,sick_days,compassionate_days,unpaid_days,other_days,created_at,updated_at";

const LEAVE_SELECT =
  "id,owner_id,employee_id,start_date,end_date,leave_type,status,notes,approved_at,rejected_at,notification_sent_at,created_at,updated_at";

function parseLeaveYear(raw: string | null): number {
  const year = Number(raw);
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return currentLeaveYear();
  return Math.floor(year);
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
    const leaveYear = parseLeaveYear(req.nextUrl.searchParams.get("year"));

    const { data: employeesData, error: employeesErr } = await admin
      .from("visitor_employees")
      .select("id,owner_id,full_name,department,employee_code,member_type,email,job_title,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,created_at,updated_at")
      .eq("owner_id", ownerId)
      .order("full_name", { ascending: true });

    if (employeesErr) {
      if (isMissingEmployeesTable(employeesErr)) {
        return NextResponse.json({ allocations: [], setupRequired: true });
      }
      return NextResponse.json({ error: employeesErr.message }, { status: 500 });
    }

    const employees = ((employeesData ?? []) as EmployeeRow[]).map(mapEmployeeRow);

    const { data: allocationData, error: allocationErr } = await admin
      .from("visitor_employee_leave_allocations")
      .select(ALLOCATION_SELECT)
      .eq("owner_id", ownerId)
      .eq("leave_year", leaveYear);

    if (allocationErr) {
      if (isMissingLeaveAllocationsTable(allocationErr)) {
        return NextResponse.json({ allocations: [], setupRequired: true, leaveYear });
      }
      return NextResponse.json({ error: allocationErr.message }, { status: 500 });
    }

    const allocationByEmployee = new Map(
      ((allocationData ?? []) as EmployeeLeaveAllocationRow[]).map((row) => [
        row.employee_id,
        mapLeaveAllocationRow(row, row.employee_id, leaveYear),
      ])
    );

    const yearStart = `${leaveYear}-01-01`;
    const yearEnd = `${leaveYear}-12-31`;

    const { data: leaveData, error: leaveErr } = await admin
      .from("visitor_employee_leave")
      .select(LEAVE_SELECT)
      .eq("owner_id", ownerId)
      .lte("start_date", yearEnd)
      .gte("end_date", yearStart);

    if (leaveErr) {
      if (isMissingLeaveTable(leaveErr)) {
        return NextResponse.json({ allocations: [], setupRequired: true, leaveYear });
      }
      return NextResponse.json({ error: leaveErr.message }, { status: 500 });
    }

    const leaveRecords = ((leaveData ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow);

    const allocations: EmployeeLeaveAllocationView[] = employees.map((employee) => {
      const allocation =
        allocationByEmployee.get(employee.id) ??
        mapLeaveAllocationRow(null, employee.id, leaveYear);
      return {
        employeeId: employee.id,
        fullName: employee.fullName,
        department: employee.department,
        employeeCode: employee.employeeCode,
        leaveYear,
        allocation,
        balances: buildEmployeeLeaveBalances(allocation, leaveRecords, employee.id, leaveYear),
      };
    });

    return NextResponse.json({ allocations, leaveYear });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    const employeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const leaveYear = parseLeaveYear(
      String(body.leaveYear ?? body.leave_year ?? currentLeaveYear())
    );

    if (!employeeId) {
      return NextResponse.json({ error: "Select an employee." }, { status: 400 });
    }

    const { data: empRow, error: empErr } = await admin
      .from("visitor_employees")
      .select("id")
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

    const allocation = normalizeAllocationInput(employeeId, leaveYear, body);
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("visitor_employee_leave_allocations")
      .upsert(
        {
          owner_id: ownerId,
          employee_id: employeeId,
          leave_year: leaveYear,
          annual_days: allocation.annualDays,
          sick_days: allocation.sickDays,
          compassionate_days: allocation.compassionateDays,
          unpaid_days: allocation.unpaidDays,
          other_days: allocation.otherDays,
          updated_at: now,
        },
        { onConflict: "owner_id,employee_id,leave_year" }
      )
      .select(ALLOCATION_SELECT)
      .single();

    if (error) {
      if (isMissingLeaveAllocationsTable(error)) {
        return NextResponse.json(
          { error: "Run database/visitor_employees_patch_16_leave_allocations.sql in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const yearStart = `${leaveYear}-01-01`;
    const yearEnd = `${leaveYear}-12-31`;
    const { data: leaveData } = await admin
      .from("visitor_employee_leave")
      .select(LEAVE_SELECT)
      .eq("owner_id", ownerId)
      .eq("employee_id", employeeId)
      .lte("start_date", yearEnd)
      .gte("end_date", yearStart);

    const leaveRecords = ((leaveData ?? []) as EmployeeLeaveRow[]).map(mapLeaveRow);
    const saved = mapLeaveAllocationRow(data as EmployeeLeaveAllocationRow, employeeId, leaveYear);

    return NextResponse.json({
      allocation: saved,
      balances: buildEmployeeLeaveBalances(saved, leaveRecords, employeeId, leaveYear),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
