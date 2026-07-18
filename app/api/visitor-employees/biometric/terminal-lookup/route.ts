import { NextRequest, NextResponse } from "next/server";

import { BIOMETRIC_SETUP_MESSAGE, isMissingBiometricTable } from "@/lib/employees/biometric";
import { lookupBiometricTerminal } from "@/lib/employees/process-biometric-scan";
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

    const result = await lookupBiometricTerminal(admin, terminal);
    if (!result.ok) {
      if (isMissingBiometricTable({ message: result.error })) {
        return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { data: userData } = await admin.auth.admin.getUserById(result.terminal.ownerId);
    const meta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
    const businessName = String(meta.business_name ?? meta.businessName ?? "").trim();

    return NextResponse.json({
      terminal: {
        name: result.terminal.name,
        status: result.terminal.status,
      },
      businessName: businessName || "Organisation",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingBiometricTable(e)) {
      return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
