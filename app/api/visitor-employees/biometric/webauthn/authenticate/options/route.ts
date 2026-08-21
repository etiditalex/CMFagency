import { NextRequest, NextResponse } from "next/server";

import { BIOMETRIC_SETUP_MESSAGE } from "@/lib/employees/biometric";
import {
  lookupBiometricTerminal,
} from "@/lib/employees/process-biometric-scan";
import {
  generateEmployeeAuthenticationOptions,
  isMissingWebAuthnOrBiometricTable,
  parseWebAuthnJsonBody,
  resolveWebAuthnRp,
} from "@/lib/employees/webauthn-server";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = parseWebAuthnJsonBody(await req.json().catch(() => ({})));
    const employeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const terminal = body.terminal ?? body.terminalToken ?? body.terminal_token;

    if (!employeeId) {
      return NextResponse.json({ error: "Confirm the employee before scanning." }, { status: 400 });
    }

    const terminalLookup = await lookupBiometricTerminal(admin, terminal);
    if (!terminalLookup.ok) {
      return NextResponse.json({ error: terminalLookup.error }, { status: terminalLookup.status });
    }

    const { data: employee, error: empErr } = await admin
      .from("visitor_employees")
      .select("id,status")
      .eq("id", employeeId)
      .eq("owner_id", terminalLookup.terminal.ownerId)
      .maybeSingle();

    if (empErr) {
      return NextResponse.json({ error: empErr.message }, { status: 500 });
    }
    if (!employee || String(employee.status) !== "active") {
      return NextResponse.json({ error: "Employee not found on this terminal." }, { status: 404 });
    }

    const rp = resolveWebAuthnRp(req);
    const result = await generateEmployeeAuthenticationOptions(admin, rp, {
      ownerId: terminalLookup.terminal.ownerId,
      employeeId,
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
