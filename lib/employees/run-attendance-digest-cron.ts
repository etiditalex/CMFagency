import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchOwnerAttendanceRegisterRange } from "@/lib/employees/fetch-owner-attendance-register";
import { fetchOwnerReportingSettings } from "@/lib/employees/fetch-reporting-settings";
import { resolveAttendanceDigestRecipients } from "@/lib/employees/resolve-attendance-digest-recipients";
import {
  sendAttendanceDigestEmail,
  type AttendanceDigestKind,
} from "@/lib/employees/send-attendance-digest-email";
import { shiftsFromSettings } from "@/lib/employees/shifts";
import {
  eatDayKey,
  eatMinutesFromIso,
  eatNextDayKey,
  eatTodayDayKey,
} from "@/lib/time/eat";

function minutesFromHhMm(raw: string | null | undefined): number | null {
  const m = String(raw ?? "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function eatNowParts(now = new Date()): {
  dayKey: string;
  minutes: number;
  weekdayMon0: number;
  ymdParts: { y: number; m: number; d: number };
} {
  const dayKey = eatDayKey(now);
  const minutes = eatMinutesFromIso(now.toISOString()) ?? 0;
  // Mon=0 … Sun=6 in EAT
  const noon = new Date(`${dayKey}T12:00:00+03:00`);
  const utcDay = noon.getUTCDay(); // 0 Sun
  const weekdayMon0 = utcDay === 0 ? 6 : utcDay - 1;
  const [y, m, d] = dayKey.split("-").map(Number);
  return { dayKey, minutes, weekdayMon0, ymdParts: { y, m, d } };
}

function addEatDays(dayKey: string, delta: number): string {
  const d = new Date(`${dayKey}T12:00:00+03:00`);
  d.setTime(d.getTime() + delta * 86_400_000);
  return eatDayKey(d);
}

function previousWeekRange(todayKey: string): { from: string; to: string; periodKey: string; label: string } {
  // Previous Mon–Sun relative to today's EAT calendar.
  const noon = new Date(`${todayKey}T12:00:00+03:00`);
  const utcDay = noon.getUTCDay();
  const mon0 = utcDay === 0 ? 6 : utcDay - 1;
  const thisMonday = addEatDays(todayKey, -mon0);
  const prevMonday = addEatDays(thisMonday, -7);
  const prevSunday = addEatDays(prevMonday, 6);
  return {
    from: prevMonday,
    to: prevSunday,
    periodKey: `weekly:${prevMonday}_${prevSunday}`,
    label: `${prevMonday} to ${prevSunday}`,
  };
}

function previousMonthRange(todayKey: string): { from: string; to: string; periodKey: string; label: string } {
  const [y, m] = todayKey.split("-").map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const from = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const to = `${prevY}-${String(prevM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return {
    from,
    to,
    periodKey: `monthly:${prevY}-${String(prevM).padStart(2, "0")}`,
    label: `${from} to ${to}`,
  };
}

async function wasDigestSent(
  admin: SupabaseClient,
  ownerId: string,
  periodKey: string
): Promise<boolean> {
  const { data, error } = await admin
    .from("visitor_employee_attendance_digests")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("period_key", periodKey)
    .maybeSingle();
  if (error) {
    // Table may not exist yet — treat as not sent so ops can see failures in logs.
    if (/digests|does not exist|schema cache/i.test(error.message)) {
      console.warn("[attendance-digest] digests table missing — run patch 18");
      return true; // skip to avoid spam until migration applied
    }
    console.warn("[attendance-digest] wasDigestSent", error.message);
    return true;
  }
  return Boolean(data);
}

async function markDigestSent(
  admin: SupabaseClient,
  ownerId: string,
  kind: AttendanceDigestKind,
  periodKey: string,
  from: string,
  to: string
): Promise<void> {
  const { error } = await admin.from("visitor_employee_attendance_digests").upsert(
    {
      owner_id: ownerId,
      digest_kind: kind,
      period_key: periodKey,
      period_from: from,
      period_to: to,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,period_key" }
  );
  if (error) {
    console.warn("[attendance-digest] markDigestSent", error.message);
  }
}

async function sendOneDigest(params: {
  admin: SupabaseClient;
  ownerId: string;
  kind: AttendanceDigestKind;
  from: string;
  to: string;
  periodKey: string;
  periodLabel: string;
}): Promise<"sent" | "skipped" | "failed"> {
  if (await wasDigestSent(params.admin, params.ownerId, params.periodKey)) {
    return "skipped";
  }

  const recipients = await resolveAttendanceDigestRecipients(params.admin, params.ownerId);
  if (recipients.length === 0) return "skipped";

  const register = await fetchOwnerAttendanceRegisterRange(
    params.admin,
    params.ownerId,
    params.from,
    params.to,
    `${params.kind === "daily" ? "Daily" : params.kind === "weekly" ? "Weekly" : "Monthly"} · ${params.periodLabel}`
  );
  if (!register) return "skipped";

  // Still send empty-day digests so owners know nobody signed in.
  const ok = await sendAttendanceDigestEmail({
    to: recipients,
    businessName: register.businessName,
    kind: params.kind,
    from: params.from,
    toDate: params.to,
    periodLabel: params.periodLabel,
    rowCount: register.rowCount,
    pdfAttachment: {
      filename: register.pdf.filename,
      contentBase64: register.pdf.buffer.toString("base64"),
    },
    excelAttachment: {
      filename: register.excel.filename,
      contentBase64: register.excel.buffer.toString("base64"),
    },
  });

  if (!ok) return "failed";

  await markDigestSent(
    params.admin,
    params.ownerId,
    params.kind,
    params.periodKey,
    params.from,
    params.to
  );
  return "sent";
}

function dailySendReady(
  settingsSignOut: string | null | undefined,
  shiftEnabled: boolean,
  shiftSignOuts: string[],
  nowMinutes: number
): boolean {
  const candidates: number[] = [];
  if (shiftEnabled && shiftSignOuts.length > 0) {
    for (const t of shiftSignOuts) {
      const m = minutesFromHhMm(t);
      if (m != null) candidates.push(m + 30);
    }
  } else {
    const dayOut = minutesFromHhMm(settingsSignOut);
    if (dayOut != null) candidates.push(dayOut + 30);
  }
  if (candidates.length === 0) candidates.push(17 * 60 + 30); // default 17:30 EAT
  // End of day / last shift: wait until the latest expected close + 30 minutes.
  const sendAfter = Math.max(...candidates);
  // Late evening catch-up if the hourly cron missed the window.
  return nowMinutes >= sendAfter || nowMinutes >= 20 * 60;
}

export type AttendanceDigestRunResult = {
  owners: number;
  sent: number;
  skipped: number;
  failed: number;
  details: { ownerId: string; kind: AttendanceDigestKind; status: string; periodKey: string }[];
};

/** Hourly cron: send due daily / weekly / monthly PDF digests per organisation. */
export async function runAttendanceDigestCron(
  admin: SupabaseClient,
  now = new Date()
): Promise<AttendanceDigestRunResult> {
  const { dayKey, minutes, weekdayMon0, ymdParts } = eatNowParts(now);

  const { data: ownerRows, error } = await admin
    .from("visitor_employees")
    .select("owner_id")
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const ownerIds = [...new Set((ownerRows ?? []).map((r) => String((r as { owner_id: string }).owner_id)))];

  const result: AttendanceDigestRunResult = {
    owners: ownerIds.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  const week = previousWeekRange(dayKey);
  const month = previousMonthRange(dayKey);
  const sendWeekly = weekdayMon0 === 0 && minutes >= 8 * 60; // Monday from 08:00 EAT
  const sendMonthly = ymdParts.d === 1 && minutes >= 8 * 60; // 1st from 08:00 EAT

  for (const ownerId of ownerIds) {
    const settings = await fetchOwnerReportingSettings(admin, ownerId);
    const shiftEnabled = settings.shiftEnabled === true;
    const shifts = shiftEnabled ? shiftsFromSettings(settings) : [];
    const shiftSignOuts = shifts.map((s) => s.signOutTime).filter(Boolean);

    if (dailySendReady(settings.staffReportingSignOut, shiftEnabled, shiftSignOuts, minutes)) {
      const periodKey = `daily:${dayKey}`;
      const status = await sendOneDigest({
        admin,
        ownerId,
        kind: "daily",
        from: dayKey,
        to: dayKey,
        periodKey,
        periodLabel: dayKey,
      });
      result.details.push({ ownerId, kind: "daily", status, periodKey });
      if (status === "sent") result.sent += 1;
      else if (status === "failed") result.failed += 1;
      else result.skipped += 1;
    }

    if (sendWeekly) {
      const status = await sendOneDigest({
        admin,
        ownerId,
        kind: "weekly",
        from: week.from,
        to: week.to,
        periodKey: week.periodKey,
        periodLabel: week.label,
      });
      result.details.push({ ownerId, kind: "weekly", status, periodKey: week.periodKey });
      if (status === "sent") result.sent += 1;
      else if (status === "failed") result.failed += 1;
      else result.skipped += 1;
    }

    if (sendMonthly) {
      const status = await sendOneDigest({
        admin,
        ownerId,
        kind: "monthly",
        from: month.from,
        to: month.to,
        periodKey: month.periodKey,
        periodLabel: month.label,
      });
      result.details.push({ ownerId, kind: "monthly", status, periodKey: month.periodKey });
      if (status === "sent") result.sent += 1;
      else if (status === "failed") result.failed += 1;
      else result.skipped += 1;
    }
  }

  return result;
}

/** Exported for tests / manual tooling. */
export function attendanceDigestSchedulePreview(now = new Date()) {
  const { dayKey, minutes, weekdayMon0, ymdParts } = eatNowParts(now);
  return {
    dayKey,
    minutes,
    weekdayMon0,
    sendWeekly: weekdayMon0 === 0 && minutes >= 8 * 60,
    sendMonthly: ymdParts.d === 1 && minutes >= 8 * 60,
    nextDayKey: eatNextDayKey(dayKey),
    today: eatTodayDayKey(),
  };
}
