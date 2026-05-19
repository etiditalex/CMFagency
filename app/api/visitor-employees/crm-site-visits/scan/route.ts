import { NextRequest, NextResponse } from "next/server";

import { processCrmSiteScan } from "@/lib/employees/process-crm-site-visit";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export const dynamic = "force-dynamic";

/** Public CRM site sign-in / sign-out with employee QR token + live GPS. */
export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const actionRaw = String(body.action ?? "").toLowerCase();
    const action = actionRaw === "sign_out" || actionRaw === "sign-out" ? "sign_out" : "sign_in";

    const deviceId = String(body.deviceId ?? body.device_id ?? "").trim() || null;
    const deviceLabel = String(body.deviceLabel ?? body.device_label ?? "").trim() || "Mobile device";

    const result = await processCrmSiteScan(admin, {
      token: body.token ?? body.qrToken,
      action,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
      projectName: typeof body.projectName === "string" ? body.projectName : null,
      latitude: body.latitude,
      longitude: body.longitude,
      accuracyMeters: body.accuracyMeters ?? body.accuracy,
      deviceId,
      deviceLabel,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      action: result.action,
      visit: result.visit,
      employeeName: result.employeeName,
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
