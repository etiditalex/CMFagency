import { NextRequest, NextResponse } from "next/server";

import {
  isMissingEmployeesTable,
  mapAttendanceRow,
  type EmployeeAttendanceRow,
} from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";
import { eatDayBoundsUtc } from "@/lib/time/eat";

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

    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";
    const fromYmd = req.nextUrl.searchParams.get("from")?.trim() ?? "";
    const toYmd = req.nextUrl.searchParams.get("to")?.trim() ?? "";
    const limit = Math.min(
      2000,
      Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50)
    );

    let q = admin
      .from("visitor_employee_attendance")
      .select("id,employee_id,owner_id,event_type,device_id,device_label,device_info,created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (employeeId) q = q.eq("employee_id", employeeId);
    if (fromYmd) {
      const fromBounds = eatDayBoundsUtc(fromYmd);
      if (fromBounds) q = q.gte("created_at", fromBounds.startIso);
    }
    if (toYmd) {
      const toBounds = eatDayBoundsUtc(toYmd);
      if (toBounds) q = q.lte("created_at", toBounds.endIso);
    }

    const { data, error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({ attendance: [], setupRequired: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const attendance = ((data ?? []) as EmployeeAttendanceRow[]).map(mapAttendanceRow);
    return NextResponse.json({ attendance });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
