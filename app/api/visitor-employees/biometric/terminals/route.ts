import { NextRequest, NextResponse } from "next/server";

import { BIOMETRIC_SETUP_MESSAGE, biometricCheckPath } from "@/lib/employees/biometric";
import { ensureBiometricTerminalForOwner } from "@/lib/employees/process-biometric-scan";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { resolveAdminOwnerScope } from "@/lib/visitors/admin-business-scope";
import { adminOwnerScopeErrorResponse } from "@/lib/visitors/admin-business-scope-api";
import { assertVisitorSubscriptionAllows } from "@/lib/visitors/require-visitor-subscription";

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

    const result = await ensureBiometricTerminalForOwner(admin, scope.ownerId);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          setupRequired: result.setupRequired === true,
          message: result.setupRequired ? BIOMETRIC_SETUP_MESSAGE : result.error,
        },
        { status: result.setupRequired ? 200 : 500 }
      );
    }

    const origin = req.nextUrl.origin;
    return NextResponse.json({
      terminal: {
        ...result.terminal,
        checkUrl: biometricCheckPath(result.terminal.terminalToken, origin),
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
