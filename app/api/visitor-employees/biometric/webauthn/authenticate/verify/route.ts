/**
 * Shared reception kiosk — WebAuthn assertion verify.
 *
 * This kiosk is one tablet at reception, not a per-employee phone. WebAuthn's
 * fingerprint prompt only proves that a finger already enrolled in THIS DEVICE's
 * OS biometric store unlocked the stored credential for the employee who was
 * just selected. It is not cryptographic proof that that credential's enrolled
 * owner touched the sensor, and it is not 1:N fingerprint matching: the OS does
 * not bind each WebAuthn key to a distinct employee's finger when several staff
 * share one platform authenticator.
 *
 * Treat the fingerprint step as an identity-confirmation / convenience layer on
 * top of the member ID / name search — not a tamper-proof biometric guarantee.
 * Do not present this to admins or employees as unspoofable. Real
 * spoof-resistant multi-user matching needs a dedicated fingerprint scanner SDK
 * with server-side minutiae matching, not WebAuthn.
 */

import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { BIOMETRIC_SETUP_MESSAGE, isMissingBiometricTable } from "@/lib/employees/biometric";
import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import {
  lookupBiometricTerminal,
  recordVerifiedBiometricAttendance,
} from "@/lib/employees/process-biometric-scan";
import {
  isMissingWebAuthnOrBiometricTable,
  parseWebAuthnJsonBody,
  resolveWebAuthnRp,
  verifyEmployeeAuthentication,
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
    const assertion = (body.assertion ?? body.response ?? body.credential) as
      | AuthenticationResponseJSON
      | undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    if (!employeeId) {
      return NextResponse.json({ error: "Confirm the employee before scanning." }, { status: 400 });
    }
    if (!assertion || typeof assertion !== "object" || !assertion.id) {
      return NextResponse.json({ error: "Missing fingerprint assertion." }, { status: 400 });
    }

    const terminalLookup = await lookupBiometricTerminal(admin, terminal);
    if (!terminalLookup.ok) {
      return NextResponse.json({ error: terminalLookup.error }, { status: terminalLookup.status });
    }

    const rp = resolveWebAuthnRp(req);
    const verified = await verifyEmployeeAuthentication(admin, rp, {
      ownerId: terminalLookup.terminal.ownerId,
      employeeId,
      response: assertion,
    });

    if (!verified.ok) {
      if (isMissingWebAuthnOrBiometricTable({ message: verified.error })) {
        return NextResponse.json({ error: BIOMETRIC_SETUP_MESSAGE }, { status: 503 });
      }
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }

    const result = await recordVerifiedBiometricAttendance(admin, {
      terminal,
      employeeId,
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
        result.error.includes("patch_20") ||
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
