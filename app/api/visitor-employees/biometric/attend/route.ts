import { NextRequest, NextResponse } from "next/server";

import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import {
  biometricSetupError,
  consumeChallenge,
  isMissingBiometricTable,
  loadChallenge,
  lookupStationOwner,
  resolveEmployeeForBiometric,
  verifyAttendanceCredential,
  webAuthnRelyingParty,
} from "@/lib/employees/biometric";
import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { processEmployeeQrScan } from "@/lib/employees/process-employee-scan";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const challengeId = String(body.challengeId ?? "").trim();
    const token = String(body.token ?? "").trim();
    const stationToken = String(body.stationToken ?? "").trim();
    const response = body.response as AuthenticationResponseJSON | undefined;
    if (!challengeId || !response) {
      return NextResponse.json({ error: "Fingerprint attendance was incomplete." }, { status: 400 });
    }

    const challenge = await loadChallenge(admin, challengeId);
    if (!challenge) {
      return NextResponse.json({ error: "This fingerprint prompt expired. Try again." }, { status: 400 });
    }

    if (stationToken) {
      const ownerId = await lookupStationOwner(admin, stationToken);
      if (!ownerId || ownerId !== challenge.owner_id || !challenge.station) {
        return NextResponse.json({ error: "This fingerprint station link is not valid." }, { status: 403 });
      }
    } else {
      const resolved = await resolveEmployeeForBiometric(admin, token);
      if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
      if (challenge.employee_id !== resolved.employee.id) {
        return NextResponse.json({ error: "This scan does not match the employee link." }, { status: 403 });
      }
    }

    const { rpID, origins } = webAuthnRelyingParty(req);
    const verified = await verifyAttendanceCredential(admin, {
      challenge,
      response,
      expectedOrigin: origins,
      expectedRPID: rpID,
    });
    await consumeChallenge(admin, challengeId);
    if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

    const { data: employeeRow, error: tokenErr } = await admin
      .from("visitor_employees")
      .select("qr_code_token")
      .eq("id", verified.employeeId)
      .maybeSingle();
    if (tokenErr || !employeeRow?.qr_code_token) {
      return NextResponse.json({ error: "Employee pass could not be loaded." }, { status: 404 });
    }

    const userAgent = req.headers.get("user-agent") ?? undefined;
    const result = await processEmployeeQrScan(admin, {
      token: employeeRow.qr_code_token,
      action: body.action ?? body.mode ?? "toggle",
      deviceId: body.deviceId ?? body.device_id,
      deviceLabel: body.deviceLabel ?? body.device_label,
      userAgent: body.userAgent ?? userAgent,
      platform: body.platform,
      language: body.language,
      latitude: body.latitude ?? body.lat,
      longitude: body.longitude ?? body.lng ?? body.lon,
      accuracyMeters: body.accuracyMeters ?? body.accuracy_meters ?? body.accuracy,
      scanSource: stationToken ? "biometric_station" : "biometric",
      trustedBiometric: true,
      authenticatorAttachment: verified.attachment,
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({
      success: true,
      finger: "right_thumb",
      eventType: result.eventType,
      occurredAt: result.occurredAt,
      deviceLabel: result.deviceLabel,
      businessName: result.businessName,
      emailSent: result.emailSent,
      employeeEmailSent: result.employeeEmailSent,
      employee: {
        id: result.employee.id,
        fullName: result.employee.fullName,
        department: result.employee.department,
        employeeCode: result.employee.employeeCode,
        attendanceStatus: result.employee.attendanceStatus,
        lastSignedInAt: result.employee.lastSignedInAt,
        lastSignedOutAt: result.employee.lastSignedOutAt,
      },
    });
  } catch (e: unknown) {
    if (isMissingBiometricTable(e) || isMissingEmployeesTable(e)) {
      const setup = biometricSetupError();
      return NextResponse.json({ error: setup.error, setupRequired: true }, { status: setup.status });
    }
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
