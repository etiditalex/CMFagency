import { NextRequest, NextResponse } from "next/server";

import {
  isMissingEmployeesTable,
  mapEmployeeRow,
  type EmployeeRow,
} from "@/lib/employees/db-mapper";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

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
    const patch: Record<string, unknown> = {};

    if (body.fullName !== undefined || body.full_name !== undefined) {
      const full_name = safeText(body.fullName ?? body.full_name, 200);
      if (!full_name) return NextResponse.json({ error: "Full name cannot be empty." }, { status: 400 });
      patch.full_name = full_name;
    }
    if (body.email !== undefined) {
      const emailRaw = safeText(body.email, 200);
      patch.email = emailRaw && emailRaw.includes("@") ? emailRaw : null;
    }
    if (body.department !== undefined) patch.department = safeText(body.department, 120);
    if (body.jobTitle !== undefined || body.job_title !== undefined) {
      patch.job_title = safeText(body.jobTitle ?? body.job_title, 120);
    }
    if (body.employeeCode !== undefined || body.employee_code !== undefined) {
      const code = safeText(body.employeeCode ?? body.employee_code, 64);
      patch.employee_code = code || null;
    }
    if (body.status !== undefined) {
      const status = String(body.status).toLowerCase();
      if (status !== "active" && status !== "inactive") {
        return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      }
      patch.status = status;
    }
    if (body.attendanceStatus !== undefined || body.attendance_status !== undefined) {
      const st = String(body.attendanceStatus ?? body.attendance_status).toLowerCase();
      if (st !== "in" && st !== "out") {
        return NextResponse.json({ error: "Invalid attendance status." }, { status: 400 });
      }
      patch.attendance_status = st;
    }
    if (body.lastSignedInAt !== undefined || body.last_signed_in_at !== undefined) {
      const iso = parseIso(body.lastSignedInAt ?? body.last_signed_in_at);
      patch.last_signed_in_at = iso;
    }
    if (body.lastSignedOutAt !== undefined || body.last_signed_out_at !== undefined) {
      const iso = parseIso(body.lastSignedOutAt ?? body.last_signed_out_at);
      patch.last_signed_out_at = iso;
    }
    if (body.memberType !== undefined || body.member_type !== undefined) {
      const raw = String(body.memberType ?? body.member_type).toLowerCase();
      if (raw !== "staff" && raw !== "crm") {
        return NextResponse.json({ error: "Team must be staff or crm." }, { status: 400 });
      }
      patch.member_type = raw;
    }
    if (body.clearDeviceLink === true || body.clear_device_link === true) {
      patch.registered_device_id = null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    let q = admin.from("visitor_employees").update(patch).eq("id", id);
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { data, error } = await q.select().maybeSingle();
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({ error: "Employee tables not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

    return NextResponse.json({ employee: mapEmployeeRow(data as EmployeeRow) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    let q = admin.from("visitor_employees").delete().eq("id", id);
    if (!isAdmin) q = q.eq("owner_id", userId);

    const { error } = await q;
    if (error) {
      if (isMissingEmployeesTable(error)) {
        return NextResponse.json({ error: "Employee tables not set up." }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
