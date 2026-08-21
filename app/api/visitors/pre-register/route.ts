import { NextRequest, NextResponse } from "next/server";

import { createVisitorPreRegistration } from "@/lib/visitors/create-preregistration";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";
import {
  visitorArrivalQrPayload,
  visitorGateTokenForOwner,
} from "@/lib/visitors/preregistration";

function safeText(v: unknown, max: number) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  return s.slice(0, max);
}

/** Public industry form pre-registration — saves a visit to verify later via QR. */
export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const industrySlug = safeText(body.industrySlug ?? body.industry_slug, 80);
    const ownerId = safeText(body.ownerId ?? body.owner_id, 80);
    const values =
      body.values && typeof body.values === "object" && !Array.isArray(body.values)
        ? (body.values as Record<string, unknown>)
        : body;

    const result = await createVisitorPreRegistration(admin, {
      industrySlug,
      ownerId,
      values,
      sendConfirmationEmail: body.sendConfirmationEmail === true,
      deviceId: body.deviceId ?? body.device_id,
      deviceLabel: body.deviceLabel ?? body.device_label,
      userAgent: body.userAgent ?? req.headers.get("user-agent"),
      platform: body.platform,
      language: body.language,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const origin = req.nextUrl.origin;
    const passUrl = result.visitor.qrCodeToken
      ? visitorArrivalQrPayload({ token: result.visitor.qrCodeToken, siteOrigin: origin })
      : visitorArrivalQrPayload({
          gate: visitorGateTokenForOwner(ownerId),
          siteOrigin: origin,
        });

    return NextResponse.json({
      ok: true,
      visitor: result.visitor,
      preRegister: {
        visitorId: result.visitor.id,
        venueName: result.venueName,
        visitorName: result.visitor.fullName,
        visitDate: result.visitor.visitDate,
        qrToken: result.visitor.qrCodeToken,
        passUrl,
        emailSent: result.emailSent,
        deviceLabel: result.visitor.deviceLabel,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
