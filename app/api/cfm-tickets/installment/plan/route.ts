import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { ensureCfmaCampaign } from "@/lib/ensure-cfma-campaigns";
import { ensureCampaignFromEvent, normalizeSlug } from "@/lib/ensure-campaign-from-event";
import { normalizeInstallmentEmail } from "@/lib/lipa-pole-pole";
import { validateReferredByNameOnly } from "@/lib/referred-by-name-only";
import { normalizeKenyaPhone, parseOptionalKenyaPhone } from "@/lib/kenya-phone";

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  unit_amount: number;
  max_per_txn: number;
  type: string;
  is_active?: boolean;
};

async function loadCampaign(
  slug: string,
  supabase: SupabaseClient<any>,
  supabaseAdmin: SupabaseClient<any> | null
): Promise<CampaignRow | null> {
  if (supabaseAdmin) {
    const { data: adminCampaign } = await supabaseAdmin
      .from("campaigns")
      .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn,is_active")
      .eq("slug", slug)
      .maybeSingle();
    if (adminCampaign) {
      const row = adminCampaign as CampaignRow & { is_active?: boolean };
      if (row.is_active === false) return null;
      return row as CampaignRow;
    }
    const ensuredCfma = await ensureCfmaCampaign(supabaseAdmin, slug);
    if (ensuredCfma) return ensuredCfma as unknown as CampaignRow;
    const ensuredFromEvent = await ensureCampaignFromEvent(supabaseAdmin, slug);
    if (ensuredFromEvent) return ensuredFromEvent as unknown as CampaignRow;
  }
  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .eq("slug", slug)
    .maybeSingle();
  return campaignData ? (campaignData as CampaignRow) : null;
}

/**
 * Create or return an active Lipa Pole Pole installment plan for CFM tickets.
 * Requires SUPABASE_SERVICE_ROLE_KEY (plans are not writable under anon RLS).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      slug?: string;
      email?: string;
      phone?: string;
      payer_name?: string | null;
      referred_by?: string | null;
      referrer_phone?: string | null;
      ticket_quantity?: number;
    };

    const slug = normalizeSlug(body.slug ?? "") || (body.slug ?? "").trim().toLowerCase();
    const emailNorm = normalizeInstallmentEmail(body.email ?? "");
    const phoneNorm = normalizeKenyaPhone(body.phone ?? "");
    const payerName = (body.payer_name ?? "").trim() || null;
    const referredByRaw = (body.referred_by ?? "").trim().slice(0, 240);
    const referredByErr = validateReferredByNameOnly(referredByRaw);
    if (referredByErr) return NextResponse.json({ error: referredByErr }, { status: 400 });
    const referredBy = referredByRaw || null;
    const referrerPhoneParsed = parseOptionalKenyaPhone(body.referrer_phone ?? "");
    if (referrerPhoneParsed.error) return NextResponse.json({ error: referrerPhoneParsed.error }, { status: 400 });
    const referrerPhone = referrerPhoneParsed.phone;
    const ticketQty = Math.trunc(Number(body.ticket_quantity ?? 0));

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    if (!emailNorm) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!/^254[17]\d{8}$/.test(phoneNorm)) {
      return NextResponse.json({ error: "Valid Kenya phone is required" }, { status: 400 });
    }
    if (!Number.isFinite(ticketQty) || ticketQty < 1 || ticketQty > 10000) {
      return NextResponse.json({ error: "ticket_quantity must be between 1 and 10000" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const campaign = await loadCampaign(slug, supabase, admin);
    if (!campaign) {
      return NextResponse.json({ error: `No active campaign for slug "${slug}"` }, { status: 404 });
    }
    if (campaign.type !== "ticket") {
      return NextResponse.json({ error: "Lipa Pole Pole is only for ticket campaigns" }, { status: 400 });
    }

    const unitAmount = Math.round(Number(campaign.unit_amount));
    const totalDue = unitAmount * ticketQty;

    const { data: existing } = await admin
      .from("cfm_installment_plans")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("status", "active")
      .eq("email", emailNorm)
      .eq("phone", phoneNorm)
      .maybeSingle();

    if (existing) {
      const row = existing as {
        id: string;
        installment_token: string;
        total_due: number;
        amount_paid: number;
        ticket_quantity: number;
        unit_amount: number;
      };
      if (row.ticket_quantity !== ticketQty) {
        return NextResponse.json(
          {
            error:
              "You already have an active Lipa Pole Pole plan with a different number of tickets. Finish paying that plan or use the same ticket quantity.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json({
        plan_id: row.id,
        installment_token: row.installment_token,
        total_due_kes: row.total_due,
        amount_paid_kes: row.amount_paid,
        balance_kes: row.total_due - row.amount_paid,
        ticket_quantity: row.ticket_quantity,
        unit_amount_kes: row.unit_amount,
        existing: true,
      });
    }

    const installment_token = crypto.randomBytes(24).toString("hex");
    /** First balance reminder after 3 days; cron sends then sets next_reminder_at +3d again. */
    const nextReminder = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insErr } = await admin
      .from("cfm_installment_plans")
      .insert({
        installment_token,
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        email: emailNorm,
        phone: phoneNorm,
        payer_name: payerName,
        referred_by: referredBy,
        referrer_phone: referrerPhone,
        ticket_quantity: ticketQty,
        unit_amount: unitAmount,
        total_due: totalDue,
        amount_paid: 0,
        status: "active",
        next_reminder_at: nextReminder,
      })
      .select("id, installment_token, total_due, amount_paid, ticket_quantity, unit_amount")
      .single();

    if (insErr || !inserted) {
      return NextResponse.json({ error: insErr?.message ?? "Could not create installment plan" }, { status: 400 });
    }

    const ins = inserted as {
      id: string;
      installment_token: string;
      total_due: number;
      amount_paid: number;
      ticket_quantity: number;
      unit_amount: number;
    };

    return NextResponse.json({
      plan_id: ins.id,
      installment_token: ins.installment_token,
      total_due_kes: ins.total_due,
      amount_paid_kes: ins.amount_paid,
      balance_kes: ins.total_due - ins.amount_paid,
      ticket_quantity: ins.ticket_quantity,
      unit_amount_kes: ins.unit_amount,
      existing: false,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
