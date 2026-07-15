import { NextResponse } from "next/server";

import { runAttendanceDigestCron } from "@/lib/employees/run-attendance-digest-cron";
import { getVisitorServiceClient } from "@/lib/visitors/require-visitor-management";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hourly (Vercel Cron): send due daily / weekly / monthly attendance PDF digests.
 * Daily fires ~30 minutes after expected sign-out (or 17:30 EAT default).
 * Weekly: Mondays from 08:00 EAT (previous Mon–Sun).
 * Monthly: 1st of month from 08:00 EAT (previous calendar month).
 *
 * Requires Authorization: Bearer CRON_SECRET (Vercel injects when configured).
 * Also requires database/visitor_employees_patch_18_attendance_digests.sql.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = getVisitorServiceClient();
  if (!admin) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured", sent: 0 }, { status: 503 });
  }

  try {
    const result = await runAttendanceDigestCron(admin);
    return NextResponse.json({
      ok: true,
      ...result,
      // Keep response small in production logs
      details: result.details.filter((d) => d.status === "sent" || d.status === "failed"),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    console.error("[cron/attendance-digests]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
