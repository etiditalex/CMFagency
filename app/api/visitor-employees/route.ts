import { NextRequest, NextResponse } from "next/server";

import {
  EMPLOYEES_SETUP_MESSAGE,
  isMissingEmployeesTable,
  isMissingEmployeesTableMessage,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

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

    const memberType = req.nextUrl.searchParams.get("memberType")?.trim().toLowerCase() ?? "";

    let q = admin
      .from("visitor_employees")
      .select(
        "id,owner_id,full_name,email,department,job_title,employee_code,qr_code_token,status,attendance_status,registered_device_id,last_signed_in_at,last_signed_out_at,member_type,created_at,updated_at"
      )
      .order("full_name", { ascending: true })
      .limit(500);

    if (!isAdmin) {
      q = q.eq("owner_id", userId);
    }
    if (memberType === "staff" || memberType === "crm") {
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
    const { admin, userId } = auth;

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

    const row = {
      owner_id: userId,
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
