import { NextRequest, NextResponse } from "next/server";

import { BIOMETRIC_SETUP_MESSAGE, isMissingBiometricTable } from "@/lib/employees/biometric";
import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import {
  lookupBiometricTerminal,
  searchEmployeesForBiometricDirectory,
} from "@/lib/employees/process-biometric-scan";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function GET(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const terminal =
      req.nextUrl.searchParams.get("terminal") ??
      req.nextUrl.searchParams.get("terminalToken") ??
      "";
    const q = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("query") ?? "";

    const terminalLookup = await lookupBiometricTerminal(admin, terminal);
    if (!terminalLookup.ok) {
      if (isMissingBiometricTable({ message: terminalLookup.error })) {
        return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: terminalLookup.error }, { status: terminalLookup.status });
    }

    const result = await searchEmployeesForBiometricDirectory(
      admin,
      terminalLookup.terminal.ownerId,
      q
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ employees: result.employees });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e) || isMissingBiometricTable(e)) {
      return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
