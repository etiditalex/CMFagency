import { NextRequest, NextResponse } from "next/server";

import {
  BIOMETRIC_SETUP_MESSAGE,
  createBiometricTemplateMaterial,
  fingerLabelForIndex,
  isMissingBiometricTable,
  mapBiometricEnrollmentRow,
  parseFingerIndex,
} from "@/lib/employees/biometric";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";
import { assertVisitorSubscriptionAllows } from "@/lib/visitors/require-visitor-subscription";

const ENROLLMENT_SELECT =
  "id,owner_id,employee_id,finger_index,finger_label,status,vendor,external_id,enrolled_at,last_matched_at,revoked_at";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin, email } = auth;

    const subBlock = await assertVisitorSubscriptionAllows(
      admin,
      userId,
      isAdmin,
      "biometric_fingerprint",
      email
    );
    if (subBlock) return subBlock;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner")
    );
    if (!scope.ok) return adminOwnerScopeErrorResponse(scope)!;

    const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim() ?? "";

    let q = admin
      .from("visitor_employee_biometric_enrollments")
      .select(ENROLLMENT_SELECT)
      .eq("owner_id", scope.ownerId)
      .eq("status", "active")
      .order("enrolled_at", { ascending: false })
      .limit(500);

    if (employeeId) q = q.eq("employee_id", employeeId);

    const { data, error } = await q;
    if (error) {
      if (isMissingBiometricTable(error)) {
        return NextResponse.json({
          enrollments: [],
          setupRequired: true,
          message: BIOMETRIC_SETUP_MESSAGE,
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      enrollments: (data ?? []).map(mapBiometricEnrollmentRow),
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
    const { admin, userId, isAdmin, email } = auth;

    const subBlock = await assertVisitorSubscriptionAllows(
      admin,
      userId,
      isAdmin,
      "biometric_fingerprint",
      email
    );
    if (subBlock) return subBlock;

    const scope = await resolveAdminOwnerScope(
      admin,
      isAdmin,
      userId,
      req.nextUrl.searchParams.get("owner")
    );
    if (!scope.ok) return adminOwnerScopeErrorResponse(scope)!;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const employeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const fingerIndex = parseFingerIndex(body.fingerIndex ?? body.finger_index);
    const externalId = String(body.externalId ?? body.external_id ?? "").trim().slice(0, 120) || null;
    const vendor = String(body.vendor ?? "fusion_pad").trim().slice(0, 40) || "fusion_pad";

    if (!employeeId) {
      return NextResponse.json({ error: "Select an employee to enroll." }, { status: 400 });
    }

    const { data: employee, error: empErr } = await admin
      .from("visitor_employees")
      .select("id,owner_id,status,full_name")
      .eq("id", employeeId)
      .eq("owner_id", scope.ownerId)
      .maybeSingle();

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }
    if (!employee) {
      return NextResponse.json({ error: "Employee not found.", status: 404 });
    }
    if (String(employee.status) !== "active") {
      return NextResponse.json({ error: "Only active employees can be enrolled." }, { status: 400 });
    }

    const { data: existing } = await admin
      .from("visitor_employee_biometric_enrollments")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("finger_index", fingerIndex)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: `${fingerLabelForIndex(fingerIndex)} is already enrolled for this employee. Revoke it first to re-enroll.`,
        },
        { status: 409 }
      );
    }

    const { salt, hash } = createBiometricTemplateMaterial();
    const now = new Date().toISOString();
    const fingerLabel = fingerLabelForIndex(fingerIndex);

    const { data: inserted, error: insertErr } = await admin
      .from("visitor_employee_biometric_enrollments")
      .insert({
        owner_id: scope.ownerId,
        employee_id: employeeId,
        finger_index: fingerIndex,
        finger_label: fingerLabel,
        template_hash: hash,
        template_salt: salt,
        status: "active",
        vendor,
        external_id: externalId,
        enrolled_by: userId,
        enrolled_at: now,
        created_at: now,
        updated_at: now,
      })
      .select(ENROLLMENT_SELECT)
      .single();

    if (insertErr) {
      if (isMissingBiometricTable(insertErr)) {
        return NextResponse.json(
          { error: BIOMETRIC_SETUP_MESSAGE, setupRequired: true },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      enrollment: mapBiometricEnrollmentRow(inserted),
      employeeName: String(employee.full_name ?? ""),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
