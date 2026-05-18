import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { ensureReceptionGatesForOwner } from "@/lib/employees/process-reception-gate";
import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";
import { assertVisitorSubscriptionAllows } from "@/lib/visitors/require-visitor-subscription";
import type { EmployeeMemberType } from "@/lib/employees/types";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId, isAdmin } = auth;

    const subBlock = await assertVisitorSubscriptionAllows(
      admin,
      userId,
      isAdmin,
      "reception_qr_device"
    );
    if (subBlock) return subBlock;

    const includeCrm = req.nextUrl.searchParams.get("includeCrm") === "1";
    const memberTypes: EmployeeMemberType[] = includeCrm ? ["staff", "crm"] : ["staff"];

    const result = await ensureReceptionGatesForOwner(admin, userId, memberTypes);
    if (!result.ok) {
      const status = result.error.includes("patch_04") ? 503 : 500;
      return NextResponse.json({ error: result.error, setupRequired: status === 503 }, { status });
    }

    return NextResponse.json({ gates: result.gates });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e)) {
      return NextResponse.json(
        {
          gates: [],
          setupRequired: true,
          message: "Run database/visitor_employees_patch_04_reception_gates.sql in Supabase.",
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
