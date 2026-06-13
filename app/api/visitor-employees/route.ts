import { NextRequest, NextResponse } from "next/server";

import {
  EMPLOYEES_SETUP_MESSAGE,
  isMissingEmployeesTable,
  isMissingEmployeesTableMessage,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { findEmployeeDuplicate } from "@/lib/employees/employee-uniqueness";
import { assertRealEstateOrganization } from "@/lib/employees/require-real-estate-org";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";
import { assertVisitorSubscriptionAllows } from "@/lib/visitors/require-visitor-subscription";

function safeText(v: unknown, max: number) {
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

    const memberType = req.nextUrl.searchParams.get("memberType")?.trim().toLowerCase() ?? "";

    let q = admin
      .from("visitor_employees")
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
      )
      .eq("owner_id", ownerId)
      .order("full_name", { ascending: true })
      .limit(500);

    if (memberType === "staff" || memberType === "crm") {
      if (memberType === "crm") {
        const industryCheck = await assertRealEstateOrganization(admin, ownerId);
        if (!industryCheck.ok) {
          return NextResponse.json({ error: industryCheck.error }, { status: 403 });
        }
      }
      q = q.eq("member_type", memberType);
    }

    const { data, error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({
          employees: [],
          setupRequired: true,
          message: EMPLOYEES_SETUP_MESSAGE,
        });
      }
      return NextResponse.json(
        isMissingEmployeesTableMessage(error.message)
          ? { employees: [], setupRequired: true, message: EMPLOYEES_SETUP_MESSAGE }
          : { error: error.message },
        { status: isMissingEmployeesTableMessage(error.message) ? 200 : 500 }
      );
    }

    const employees = ((data ?? []) as EmployeeRow[]).map(mapEmployeeRow);
    return NextResponse.json({ employees });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin, email: callerEmail } = auth;

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

    const subBlock = await assertVisitorSubscriptionAllows(
      admin,
      ownerId,
      isAdmin,
      "employee_module",
      callerEmail
    );
    if (subBlock) return subBlock;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const full_name = safeText(body.fullName ?? body.full_name, 200);
    if (!full_name) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    const emailRaw = safeText(body.email, 200);
    const email = emailRaw && emailRaw.includes("@") ? emailRaw : null;
    const employee_code = safeText(body.employeeCode ?? body.employee_code, 64) || null;
    const memberTypeRaw = String(body.memberType ?? body.member_type ?? "staff").toLowerCase();
    const member_type = memberTypeRaw === "crm" ? "crm" : "staff";

    if (member_type === "crm") {
      const industryCheck = await assertRealEstateOrganization(admin, ownerId);
      if (!industryCheck.ok) {
        return NextResponse.json({ error: industryCheck.error }, { status: 403 });
      }
    }

    const duplicate = await findEmployeeDuplicate(admin, ownerId, {
      email,
      fullName: full_name,
    });
    if (duplicate) {
      return NextResponse.json({ error: duplicate.message }, { status: 400 });
    }

    const row = {
      owner_id: ownerId,
      full_name,
      email,
      department: safeText(body.department, 120),
      job_title: safeText(body.jobTitle ?? body.job_title, 120),
      employee_code,
      member_type,
      status: "active" as const,
      attendance_status: "out" as const,
    };

    const { data, error } = await admin.from("visitor_employees").insert(row).select().single();
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json(
          {
            error:
              EMPLOYEES_SETUP_MESSAGE,
          },
          { status: 503 }
        );
      }
      if (/unique|duplicate/i.test(error.message)) {
        return NextResponse.json(
          { error: "Employee code already exists for your organisation." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ employee: mapEmployeeRow(data as EmployeeRow) }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
