import { NextRequest, NextResponse } from "next/server";

import { verifyAttendanceRegisterDownloadToken } from "@/lib/employees/attendance-register-download-token";
import { fetchOwnerAttendanceRegister } from "@/lib/employees/fetch-owner-attendance-register";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export const dynamic = "force-dynamic";

/** Public download of attendance register via signed token (no login required). */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
    if (!token) {
      return NextResponse.json({ error: "Missing download token." }, { status: 400 });
    }

    const verified = verifyAttendanceRegisterDownloadToken(token);
    if (!verified) {
      return NextResponse.json({ error: "Invalid or expired download link." }, { status: 403 });
    }

    const admin = getVisitorServiceClient();
    if (!admin) {
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }
    const register = await fetchOwnerAttendanceRegister(admin, verified.ownerId, verified.dayKey);
    if (!register) {
      return NextResponse.json({ error: "Attendance register not found." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(register.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${register.filename}"`,
        "Content-Length": String(register.buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
