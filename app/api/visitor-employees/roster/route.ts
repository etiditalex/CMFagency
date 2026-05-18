import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { memberTypeLabel } from "@/lib/employees/real-estate";
import { listRosterForGate } from "@/lib/employees/process-reception-gate";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function GET(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const gate = req.nextUrl.searchParams.get("gate")?.trim() ?? "";
    const deviceId = req.nextUrl.searchParams.get("deviceId")?.trim() ?? "";
    const result = await listRosterForGate(admin, gate, deviceId);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      gate: {
        memberType: result.gate.memberType,
        teamLabel: memberTypeLabel(result.gate.memberType),
      },
      boundEmployee: result.boundEmployee,
      needsSetup: result.needsSetup,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e)) {
      return NextResponse.json({ error: "Employee tables not set up." }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
