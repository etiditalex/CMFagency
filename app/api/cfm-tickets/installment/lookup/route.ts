import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureCfmaCampaign } from "@/lib/ensure-cfma-campaigns";
import { ensureCampaignFromEvent, normalizeSlug } from "@/lib/ensure-campaign-from-event";
import { normalizeInstallmentEmail } from "@/lib/lipa-pole-pole";

function normalizeKenyaPhone(raw: string): string {
  const phoneRaw = raw.trim().replace(/\s/g, "");
  if (phoneRaw.startsWith("+254")) return `254${phoneRaw.slice(4)}`;
  if (phoneRaw.startsWith("254")) return phoneRaw;
  if (phoneRaw.startsWith("0") && phoneRaw.length >= 10) return `254${phoneRaw.slice(1)}`;
  if (phoneRaw.length === 9 && /^[17]/.test(phoneRaw)) return `254${phoneRaw}`;
  return phoneRaw;
}

type CampaignRow = { id: string; slug: string; title: string; unit_amount: number; type: string; is_active?: boolean };

async function loadCampaign(
  slug: string,
  supabase: SupabaseClient<any>,
  supabaseAdmin: SupabaseClient<any> | null
): Promise<CampaignRow | null> {
  if (supabaseAdmin) {
    const { data: adminCampaign } = await supabaseAdmin
      .from("campaigns")
      .select("id,slug,title,unit_amount,type,is_active")
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
    .select("id,slug,title,unit_amount,type")
    .eq("slug", slug)
    .maybeSingle();
  return campaignData ? (campaignData as CampaignRow) : null;
}

function escapeIlikePattern(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Look up Lipa Pole Pole balance for the given buyer + ticket slug (CFM tickets page). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      slug?: string;
      email?: string;
      phone?: string;
      /** Partial/full name as stored on the plan (payer_name). */
      verify_name?: string;
    };
    const slug = normalizeSlug(body.slug ?? "") || (body.slug ?? "").trim().toLowerCase();
    const emailNorm = normalizeInstallmentEmail(body.email ?? "");
    const phoneNorm = normalizeKenyaPhone(body.phone ?? "");
    const verifyNameRaw = (body.verify_name ?? "").trim();
    const verifyName = verifyNameRaw.length >= 2 ? escapeIlikePattern(verifyNameRaw) : "";

    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    const phoneOk = /^254[17]\d{8}$/.test(phoneNorm);
    const hasEmail = emailNorm.length > 0;
    if (!phoneOk && !hasEmail && !verifyName) {
      return NextResponse.json(
        { error: "Provide a valid Kenya phone, an email, or a name (at least 2 characters) to look up your plan." },
        { status: 400 }
      );
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
      return NextResponse.json({ found: false as const });
    }

    let plan: Record<string, unknown> | null = null;

    if (phoneOk && hasEmail) {
      const { data } = await admin
        .from("cfm_installment_plans")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active")
        .eq("email", emailNorm)
        .eq("phone", phoneNorm)
        .maybeSingle();
      plan = data ?? null;
    } else if (phoneOk) {
      const { data: rows, error: phErr } = await admin
        .from("cfm_installment_plans")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active")
        .eq("phone", phoneNorm)
        .limit(2);
      if (phErr) return NextResponse.json({ error: phErr.message }, { status: 500 });
      const list = rows ?? [];
      if (list.length > 1) {
        return NextResponse.json(
          {
            error:
              "Multiple plans match this phone for this package. Add your email from checkout so we can find the right balance.",
          },
          { status: 409 }
        );
      }
      plan = list[0] ?? null;
    } else if (hasEmail) {
      const { data: rows, error: emErr } = await admin
        .from("cfm_installment_plans")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active")
        .eq("email", emailNorm)
        .limit(2);
      if (emErr) return NextResponse.json({ error: emErr.message }, { status: 500 });
      const list = rows ?? [];
      if (list.length > 1) {
        return NextResponse.json(
          {
            error:
              "Multiple plans match this email for this package. Add your Kenya phone from checkout so we can find the right balance.",
          },
          { status: 409 }
        );
      }
      plan = list[0] ?? null;
    } else if (verifyName) {
      const { data: rows, error: nameErr } = await admin
        .from("cfm_installment_plans")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("status", "active")
        .ilike("payer_name", `%${verifyName}%`);
      if (nameErr) {
        return NextResponse.json({ error: nameErr.message }, { status: 500 });
      }
      const list = (rows ?? []) as Record<string, unknown>[];
      if (list.length === 0) {
        plan = null;
      } else if (list.length > 1) {
        return NextResponse.json(
          {
            error:
              "Multiple plans match that name. Add your phone or email from checkout so we can find the right balance.",
          },
          { status: 409 }
        );
      } else {
        plan = list[0] ?? null;
      }
    }

    if (!plan) {
      return NextResponse.json({ found: false as const, campaign_title: campaign.title });
    }

    const p = plan as {
      id: string;
      installment_token: string;
      total_due: number;
      amount_paid: number;
      ticket_quantity: number;
      unit_amount: number;
    };

    return NextResponse.json({
      found: true as const,
      campaign_title: campaign.title,
      plan_id: p.id,
      installment_token: p.installment_token,
      total_due_kes: p.total_due,
      amount_paid_kes: p.amount_paid,
      balance_kes: p.total_due - p.amount_paid,
      ticket_quantity: p.ticket_quantity,
      unit_amount_kes: p.unit_amount,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
