import { NextRequest, NextResponse } from "next/server";

import {
  biometricSetupError,
  credentialsForOwner,
  deleteEmployeeCredentials,
  ensureBiometricStation,
  isMissingBiometricTable,
} from "@/lib/employees/biometric";
import { EMPLOYEES_SETUP_MESSAGE, isMissingEmployeesTable, mapEmployeeRow, type EmployeeRow } from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";

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
    if (!scope.ok) return adminOwnerScopeErrorResponse(scope)!;
    const ownerId = scope.ownerId;

    const { data, error } = await admin
      .from("visitor_employees")
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
      )
      .eq("owner_id", ownerId)
      .order("full_name", { ascending: true })
      .limit(500);

    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({
          employees: [],
          setupRequired: true,
          message: EMPLOYEES_SETUP_MESSAGE,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let credentials: Awaited<ReturnType<typeof credentialsForOwner>> = [];
    let stationToken = "";
    try {
      credentials = await credentialsForOwner(admin, ownerId);
      stationToken = await ensureBiometricStation(admin, ownerId);
    } catch (e: unknown) {
      if (isMissingBiometricTable(e)) {
        const setup = biometricSetupError();
        return NextResponse.json(
          {
            employees: ((data ?? []) as EmployeeRow[]).map(mapEmployeeRow),
            credentials: [],
            stationToken: "",
            setupRequired: true,
            message: setup.error,
          },
          { status: 200 }
        );
      }
      throw e;
    }

    return NextResponse.json({
      employees: ((data ?? []) as EmployeeRow[]).map(mapEmployeeRow),
      credentials,
      stationToken,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingBiometricTable(e)) {
      const setup = biometricSetupError();
      return NextResponse.json({ error: setup.error, setupRequired: true }, { status: setup.status });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    if (!scope.ok) return adminOwnerScopeErrorResponse(scope)!;

    const body = (await req.json().catch(() => ({}))) as { employeeId?: unknown };
    const employeeId = String(body.employeeId ?? "").trim();
    if (!employeeId) {
      return NextResponse.json({ error: "Employee is required." }, { status: 400 });
    }

    const { data: employee, error: findErr } = await admin
      .from("visitor_employees")
      .select("id")
      .eq("id", employeeId)
      .eq("owner_id", scope.ownerId)
      .maybeSingle();
    if (findErr) {
      if (isMissingEmployeesTable(findErr)) {
        return NextResponse.json({ error: EMPLOYEES_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }
    if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

    await deleteEmployeeCredentials(admin, employeeId, scope.ownerId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (isMissingBiometricTable(e)) {
      const setup = biometricSetupError();
      return NextResponse.json({ error: setup.error, setupRequired: true }, { status: setup.status });
    }
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
