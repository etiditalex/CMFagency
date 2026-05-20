import { NextRequest, NextResponse } from "next/server";

import { isMissingEmployeesTable } from "@/lib/employees/db-mapper";
import { processEmployeeQrScan } from "@/lib/employees/process-employee-scan";
import { processEmployeeGateScan } from "@/lib/employees/process-reception-gate";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export async function POST(req: NextRequest) {
  try {
    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const scanInput = {
      token: body.token ?? body.qrToken ?? body.qr_code_token,
      gate: body.gate ?? body.gateToken,
      employeeId: body.employeeId,
      memberCode: body.memberCode ?? body.member_code,
      action: body.action ?? body.mode,
      deviceId: body.deviceId ?? body.device_id,
      deviceLabel: body.deviceLabel ?? body.device_label,
      userAgent: body.userAgent ?? userAgent,
      platform: body.platform,
      language: body.language,
      latitude: body.latitude ?? body.lat,
      longitude: body.longitude ?? body.lng ?? body.lon,
      accuracyMeters: body.accuracyMeters ?? body.accuracy_meters ?? body.accuracy,
      kioskScan: body.kioskScan ?? body.kiosk_scan,
      scanSource: body.scanSource ?? body.scan_source,
    };

    const gateToken = String(scanInput.gate ?? "").trim();
    const result = gateToken
      ? await processEmployeeGateScan(admin, scanInput)
      : await processEmployeeQrScan(admin, scanInput);

    if (!result.ok) {
      const errMsg = result.error;
      if (errMsg.includes("does not exist") || errMsg.includes("visitor_employees")) {
        return NextResponse.json(
          {
            error:
              "Employee module not set up. Run database/visitor_employees_patch_01.sql in Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      eventType: result.eventType,
      occurredAt: result.occurredAt,
      deviceLabel: result.deviceLabel,
      employee: {
        id: result.employee.id,
        fullName: result.employee.fullName,
        department: result.employee.department,
        memberType: result.employee.memberType,
        attendanceStatus: result.employee.attendanceStatus,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    if (isMissingEmployeesTable(e)) {
      return NextResponse.json(
        {
          error:
            "Employee module not set up. Run database/visitor_employees_patch_01.sql in Supabase.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
