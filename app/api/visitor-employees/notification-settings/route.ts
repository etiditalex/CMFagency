import { NextRequest, NextResponse } from "next/server";

import { requireEmployeeAccess } from "@/lib/employees/require-employee-access";

function parseWhatsAppPhone(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 15);
}

/** Owner-level attendance notification settings (stored in auth user metadata). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const { data } = await admin.auth.admin.getUserById(userId);
    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const attendanceWhatsapp = parseWhatsAppPhone(
      meta.attendance_whatsapp ?? meta.attendanceWhatsapp ?? meta.business_whatsapp
    );

    return NextResponse.json({ attendanceWhatsapp });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireEmployeeAccess(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const attendanceWhatsapp = parseWhatsAppPhone(
      body.attendanceWhatsapp ?? body.attendance_whatsapp
    );

    const { data: existing } = await admin.auth.admin.getUserById(userId);
    const currentMeta = (existing.user?.user_metadata ?? {}) as Record<string, unknown>;

    const { error } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMeta,
        attendance_whatsapp: attendanceWhatsapp,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attendanceWhatsapp });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
