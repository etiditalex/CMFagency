import { NextRequest, NextResponse } from "next/server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import {
  biometricSetupError,
  consumeChallenge,
  isMissingBiometricTable,
  loadChallenge,
  resolveEmployeeForBiometric,
  verifyAndStoreEnrollment,
  webAuthnRelyingParty,
} from "@/lib/employees/biometric";
import { processEmployeeQrScan } from "@/lib/employees/process-employee-scan";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const body = (await req.json().catch(() => ({}))) as {
      challengeId?: unknown;
      token?: unknown;
      deviceLabel?: unknown;
      response?: RegistrationResponseJSON;
      action?: unknown;
      deviceId?: unknown;
      userAgent?: unknown;
      platform?: unknown;
      language?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      accuracyMeters?: unknown;
    };
    const challengeId = String(body.challengeId ?? "").trim();
    const token = String(body.token ?? "").trim();
    if (!challengeId || !body.response || !token) {
      return NextResponse.json({ error: "Fingerprint enrollment was incomplete." }, { status: 400 });
    }

    const resolved = await resolveEmployeeForBiometric(admin, token);
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

    const challenge = await loadChallenge(admin, challengeId);
    if (!challenge) {
      return NextResponse.json({ error: "This fingerprint prompt expired. Try again." }, { status: 400 });
    }
    if (challenge.employee_id !== resolved.employee.id) {
      return NextResponse.json({ error: "This enrollment does not match the employee link." }, { status: 403 });
    }

    const { rpID, origins } = webAuthnRelyingParty(req);
    const stored = await verifyAndStoreEnrollment(admin, {
      challenge,
      response: body.response,
      expectedOrigin: origins,
      expectedRPID: rpID,
      deviceLabel: String(body.deviceLabel ?? ""),
    });
    await consumeChallenge(admin, challengeId);
    if (!stored.ok) return NextResponse.json({ error: stored.error }, { status: stored.status });

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const attendance = await processEmployeeQrScan(admin, {
      token,
      action: body.action ?? "sign_in",
      deviceId: body.deviceId,
      deviceLabel: body.deviceLabel,
      userAgent: body.userAgent ?? userAgent,
      platform: body.platform,
      language: body.language,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters,
      scanSource: "biometric",
      trustedBiometric: true,
      authenticatorAttachment: stored.attachment,
    });

    if (!attendance.ok) {
      return NextResponse.json({
        success: true,
        registered: true,
        finger: stored.finger,
        attachment: stored.attachment,
        attendanceError: attendance.error,
      });
    }

    return NextResponse.json({
      success: true,
      registered: true,
      finger: stored.finger,
      attachment: stored.attachment,
      eventType: attendance.eventType,
      occurredAt: attendance.occurredAt,
      businessName: attendance.businessName,
      emailSent: attendance.emailSent,
      employeeEmailSent: attendance.employeeEmailSent,
      employee: {
        id: attendance.employee.id,
        fullName: attendance.employee.fullName,
        department: attendance.employee.department,
        employeeCode: attendance.employee.employeeCode,
        attendanceStatus: attendance.employee.attendanceStatus,
        lastSignedInAt: attendance.employee.lastSignedInAt,
        lastSignedOutAt: attendance.employee.lastSignedOutAt,
      },
    });
  } catch (e: unknown) {
    if (isMissingBiometricTable(e)) {
      const setup = biometricSetupError();
      return NextResponse.json({ error: setup.error, setupRequired: true }, { status: setup.status });
    }
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
