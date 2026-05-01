import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLipaPolePoleEmail } from "@/lib/send-lipa-pole-pole-email";

export const dynamic = "force-dynamic";

/**
 * Daily (Vercel Cron): email buyers with an outstanding Lipa Pole Pole balance.
 * Set CRON_SECRET and Authorization: Bearer <CRON_SECRET> on the cron request (Vercel injects when configured).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const nowIso = new Date().toISOString();

  const { data: plans, error } = await supabase
    .from("cfm_installment_plans")
    .select("*")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const continueUrl = `${baseUrl}/kcm/cfm-tickets`;

  let sent = 0;
  for (const raw of plans ?? []) {
    const p = raw as {
      id: string;
      email: string;
      payer_name: string | null;
      campaign_slug: string;
      total_due: number;
      amount_paid: number;
      next_reminder_at: string | null;
    };
    const balance = p.total_due - p.amount_paid;
    if (balance <= 0) continue;
    if (p.next_reminder_at && p.next_reminder_at > nowIso) continue;

    const title = `Tickets (${p.campaign_slug})`;
    const r = await sendLipaPolePoleEmail({
      to: p.email,
      holderName: (p.payer_name ?? "").trim() || p.email,
      campaignTitle: title,
      totalDueKes: p.total_due,
      paidKes: p.amount_paid,
      balanceKes: balance,
      continueUrl,
      variant: "reminder",
    });
    if (r.ok) sent += 1;

    const next = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const prevCount = Number((raw as { reminder_count?: number }).reminder_count ?? 0);
    await supabase
      .from("cfm_installment_plans")
      .update({
        reminder_count: prevCount + 1,
        last_reminder_at: nowIso,
        next_reminder_at: next,
        updated_at: nowIso,
      })
      .eq("id", p.id);
  }

  return NextResponse.json({ ok: true, processed: (plans ?? []).length, reminders_sent: sent });
}
