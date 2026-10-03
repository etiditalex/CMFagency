import { NextRequest, NextResponse } from "next/server";

import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import {
  biometricSetupError,
  consumeChallenge,
  deletePlatformThumb,
  isMissingBiometricTable,
  loadChallenge,
  resolveEmployeeForBiometric,
  verifyAndStoreEnrollment,
  webAuthnRelyingParty,
} from "@/lib/employees/biometric";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error" }, { status: 500 });

    const body = (await req.json().catch(() => ({}))) as {
      challengeId?: unknown;
      token?: unknown;
      deviceLabel?: unknown;
      discard?: unknown;
      response?: RegistrationResponseJSON;
    };
    const challengeId = String(body.challengeId ?? "").trim();
    const token = String(body.token ?? "").trim();
    if (!token) {
      return NextResponse.json({ error: "Fingerprint enrollment was incomplete." }, { status: 400 });
    }

    const resolved = await resolveEmployeeForBiometric(admin, token);
    if (!resolved.ok) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

    if (body.discard === true) {
      await deletePlatformThumb(admin, resolved.employee.id);
      return NextResponse.json({ success: true, discarded: true });
    }

    if (!challengeId || !body.response) {
      return NextResponse.json({ error: "Fingerprint enrollment was incomplete." }, { status: 400 });
    }

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

    return NextResponse.json({
      success: true,
      registered: true,
      finger: stored.finger,
      attachment: stored.attachment,
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
