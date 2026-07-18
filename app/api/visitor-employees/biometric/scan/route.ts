import { NextRequest, NextResponse } from "next/server";

import { BIOMETRIC_SETUP_MESSAGE, isMissingBiometricTable } from "@/lib/employees/biometric";
import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { processEmployeeBiometricScan } from "@/lib/employees/process-biometric-scan";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const result = await processEmployeeBiometricScan(admin, {
      terminal: body.terminal ?? body.terminalToken ?? body.terminal_token,
      memberCode: body.memberCode ?? body.member_code,
      fingerIndex: body.fingerIndex ?? body.finger_index,
      externalId: body.externalId ?? body.external_id,
      action: body.action ?? body.mode,
      deviceId: body.deviceId ?? body.device_id,
      deviceLabel: body.deviceLabel ?? body.device_label,
      userAgent: body.userAgent ?? userAgent,
      platform: body.platform,
      language: body.language,
      latitude: body.latitude ?? body.lat,
      longitude: body.longitude ?? body.lng ?? body.lon,
      accuracyMeters: body.accuracyMeters ?? body.accuracy_meters ?? body.accuracy,
    });

    if (!result.ok) {
      if (
        result.error.includes("patch_19") ||
        result.error.includes("Biometric fingerprint module") ||
        isMissingBiometricTable({ message: result.error })
      ) {
        return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      eventType: result.eventType,
      occurredAt: result.occurredAt,
      deviceLabel: result.deviceLabel,
      fingerLabel: result.fingerLabel,
      firstEnrollment: result.firstEnrollment === true,
      businessName: result.businessName,
      emailSent: result.emailSent,
      employeeEmailSent: result.employeeEmailSent,
      employee: {
        id: result.employee.id,
        fullName: result.employee.fullName,
        department: result.employee.department,
        employeeCode: result.employee.employeeCode,
        memberType: result.employee.memberType,
        attendanceStatus: result.employee.attendanceStatus,
        lastSignedInAt: result.employee.lastSignedInAt,
        lastSignedOutAt: result.employee.lastSignedOutAt,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e) || isMissingBiometricTable(e)) {
      return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
