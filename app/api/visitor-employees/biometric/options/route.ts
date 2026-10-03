import { NextRequest, NextResponse } from "next/server";

import {
  biometricSetupError,
  createAttendanceOptions,
  createEnrollmentOptions,
  isMissingBiometricTable,
  lookupStationOwner,
  resolveEmployeeForBiometric,
  webAuthnRelyingParty,
} from "@/lib/employees/biometric";
import { isBiometricAttachment } from "@/lib/employees/biometric-shared";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const purpose = body.purpose === "enroll" ? "enroll" : body.purpose === "attend" ? "attend" : "";
    const attachment = body.attachment;
    const token = String(body.token ?? "").trim();
    const stationToken = String(body.stationToken ?? "").trim();
    if (!purpose || !isBiometricAttachment(attachment)) {
      return NextResponse.json({ error: "Choose a fingerprint sensor to continue." }, { status: 400 });
    }

    const { rpID } = webAuthnRelyingParty(req);

    if (stationToken) {
      if (purpose !== "attend") {
        return NextResponse.json(
          { error: "Record a right thumb from the employee's own biometric link." },
          { status: 400 }
        );
      }
      const ownerId = await lookupStationOwner(admin, stationToken);
      if (!ownerId) return NextResponse.json({ error: "This fingerprint station link is not valid." }, { status: 404 });
      const options = await createAttendanceOptions(admin, {
        rpID,
        attachment,
        ownerId,
        station: true,
      });
      return NextResponse.json(options);
    }

    const resolved = await resolveEmployeeForBiometric(admin, token);
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

    if (purpose === "enroll") {
      const options = await createEnrollmentOptions(admin, {
        rpID,
        employee: resolved.employee,
        ownerId: resolved.ownerId,
        attachment,
      });
      return NextResponse.json(options);
    }

    const options = await createAttendanceOptions(admin, {
      rpID,
      attachment,
      employee: resolved.employee,
      ownerId: resolved.ownerId,
      station: false,
      setupRead: body.setup === true,
    });
    return NextResponse.json(options);
  } catch (e: unknown) {
    if (isMissingBiometricTable(e)) {
      const setup = biometricSetupError();
      return NextResponse.json({ error: setup.error, setupRequired: true }, { status: setup.status });
    }
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
