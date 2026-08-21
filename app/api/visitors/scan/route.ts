import { NextRequest, NextResponse } from "next/server";

import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";
import { processVisitorArrivalScan } from "@/lib/visitors/process-visitor-scan";

/** Public arrival scan — verifies pre-registration by device and/or contact number. */
export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await processVisitorArrivalScan(admin, {
      gate: body.gate ?? body.gateToken,
      token: body.token ?? body.qrToken,
      phone: body.phone ?? body.phoneNumber,
      deviceId: body.deviceId ?? body.device_id,
      deviceLabel: body.deviceLabel ?? body.device_label,
      userAgent: body.userAgent ?? req.headers.get("user-agent"),
      platform: body.platform,
      language: body.language,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          needsPhone: result.needsPhone === true,
          visitorName: result.visitorName,
        },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      visitor: result.visitor,
      matchedBy: result.matchedBy,
      checkIn: {
        visitorId: result.visitor.id,
        venueName: result.venueName,
        visitorName: result.visitor.fullName,
        checkedInAt: result.checkedInAt,
        timeLabel: result.timeLabel,
        dateLabel: result.dateLabel,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
