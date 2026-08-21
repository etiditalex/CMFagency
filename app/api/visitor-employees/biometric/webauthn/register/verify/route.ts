import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import { BIOMETRIC_SETUP_MESSAGE } from "@/lib/employees/biometric";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import {
  isMissingWebAuthnOrBiometricTable,
  parseWebAuthnJsonBody,
  resolveWebAuthnRp,
  verifyEmployeeRegistration,
} from "@/lib/employees/webauthn-server";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";
import { assertVisitorSubscriptionAllows } from "@/lib/visitors/require-visitor-subscription";

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

    const body = parseWebAuthnJsonBody(await req.json().catch(() => ({})));
    const employeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const attestation = (body.attestation ?? body.response ?? body.credential) as
      | RegistrationResponseJSON
      | undefined;
    const deviceLabel = String(body.deviceLabel ?? body.device_label ?? "").trim();
    const deviceId = String(body.deviceId ?? body.device_id ?? "").trim() || null;

    if (!employeeId) {
      return NextResponse.json({ error: "Select an employee to enroll." }, { status: 400 });
    }
    if (!attestation || typeof attestation !== "object" || !attestation.id) {
      return NextResponse.json({ error: "Missing fingerprint registration data." }, { status: 400 });
    }

    const rp = resolveWebAuthnRp(req);
    const result = await verifyEmployeeRegistration(admin, rp, {
      ownerId: scope.ownerId,
      employeeId,
      enrolledBy: userId,
      response: attestation,
      deviceLabel,
      deviceId,
    });

    if (!result.ok) {
      if (isMissingWebAuthnOrBiometricTable({ message: result.error })) {
        return NextResponse.json(
          { error: BIOMETRIC_SETUP_MESSAGE, setupRequired: true },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      credentialId: result.credentialId,
      employeeName: result.employeeName,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
