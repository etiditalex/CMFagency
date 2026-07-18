import { NextRequest, NextResponse } from "next/server";

import {
  BIOMETRIC_SETUP_MESSAGE,
  isMissingBiometricTable,
  mapBiometricEnrollmentRow,
} from "@/lib/employees/biometric";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";
import { assertVisitorSubscriptionAllows } from "@/lib/visitors/require-visitor-subscription";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
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

    const { id } = await params;
    const enrollmentId = String(id ?? "").trim();
    if (!enrollmentId) {
      return NextResponse.json({ error: "Missing enrollment id." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from("visitor_employee_biometric_enrollments")
      .update({ status: "revoked", revoked_at: now, updated_at: now })
      .eq("id", enrollmentId)
      .eq("owner_id", scope.ownerId)
      .eq("status", "active")
      .select(
        "id,owner_id,employee_id,finger_index,finger_label,status,vendor,external_id,enrolled_at,last_matched_at,revoked_at"
      )
      .maybeSingle();

    if (error) {
      if (isMissingBiometricTable(error)) {
        return NextResponse.json(
          { error: BIOMETRIC_SETUP_MESSAGE, setupRequired: true },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Enrollment not found or already revoked." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      enrollment: mapBiometricEnrollmentRow(data),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
