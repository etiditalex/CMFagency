import { NextRequest, NextResponse } from "next/server";

import { BIOMETRIC_SETUP_MESSAGE } from "@/lib/employees/biometric";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import {
  generateEmployeeRegistrationOptions,
  isMissingWebAuthnOrBiometricTable,
  parseWebAuthnJsonBody,
  resolveWebAuthnRp,
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
    if (!employeeId) {
      return NextResponse.json({ error: "Select an employee to enroll." }, { status: 400 });
    }

    const { data: employee, error: empErr } = await admin
      .from("visitor_employees")
      .select("id,full_name,employee_code,status")
      .eq("id", employeeId)
      .eq("owner_id", scope.ownerId)
      .maybeSingle();

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }
    if (String(employee.status) !== "active") {
      return NextResponse.json({ error: "Only active employees can be enrolled." }, { status: 400 });
    }

    const rp = resolveWebAuthnRp(req);
    const result = await generateEmployeeRegistrationOptions(admin, rp, {
      ownerId: scope.ownerId,
      employeeId,
      memberCode: String(employee.employee_code ?? "").trim(),
      displayName: String(employee.full_name ?? "").trim() || "Employee",
    });

    if (!result.ok) {
      if (isMissingWebAuthnOrBiometricTable({ message: result.error })) {
        return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ options: result.options });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
