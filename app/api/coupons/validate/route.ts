import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ValidateBody = {
  slug?: string;
  code?: string;
  quantity?: number;
};

/**
 * Validates a coupon code for a campaign (by slug) and returns discounted price.
 * Used by the ticket purchase flow before payment. No auth required.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ValidateBody;
    const slug = (body.slug ?? "").trim().toLowerCase();
    const code = (body.code ?? "").trim();
    const quantity = Math.max(1, Math.trunc(Number(body.quantity ?? 1)));

    if (!slug || !code) {
      return NextResponse.json(
        { valid: false, error: "Slug and code are required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ valid: false, error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id,created_by,unit_amount,currency")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (campErr || !campaign) {
      return NextResponse.json({ valid: false, error: "Campaign not found or inactive" }, { status: 404 });
    }

    const codeLower = code.toLowerCase();
    const { data: coupon, error: couponErr } = await supabase
      .from("coupons")
      .select("id,discount_type,discount_value,campaign_id,created_by,is_active,max_uses,used_count,valid_from,valid_until")
      .eq("is_active", true)
      .ilike("code", codeLower)
      .maybeSingle();

    if (couponErr) {
      return NextResponse.json({ valid: false, error: "Could not validate code" }, { status: 500 });
    }
    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid or expired code" }, { status: 200 });
    }

    if (coupon.created_by !== campaign.created_by) {
      return NextResponse.json({ valid: false, error: "Invalid or expired code" }, { status: 200 });
    }
    if (coupon.campaign_id != null && coupon.campaign_id !== campaign.id) {
      return NextResponse.json({ valid: false, error: "This code is not valid for this event" }, { status: 200 });
    }
    if (coupon.max_uses != null && (coupon.used_count ?? 0) >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "This code has reached its usage limit" }, { status: 200 });
    }
    const now = new Date().toISOString();
    if (coupon.valid_from && now < coupon.valid_from) {
      return NextResponse.json({ valid: false, error: "This code is not yet valid" }, { status: 200 });
    }
    if (coupon.valid_until && now > coupon.valid_until) {
      return NextResponse.json({ valid: false, error: "This code has expired" }, { status: 200 });
    }

    const unitAmount = Number(campaign.unit_amount);
    const subtotal = unitAmount * quantity;
    let discountAmount: number;
    if (coupon.discount_type === "percent") {
      discountAmount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
    } else {
      discountAmount = Math.min(Number(coupon.discount_value) * quantity, subtotal);
    }
    const amountAfterDiscount = Math.max(0, subtotal - discountAmount);

    return NextResponse.json({
      valid: true,
      coupon_id: coupon.id,
      unit_amount_original: unitAmount,
      unit_amount_after_discount: quantity > 0 ? Math.round(amountAfterDiscount / quantity) : unitAmount,
      discount_amount: discountAmount,
      amount_after_discount: amountAfterDiscount,
      currency: campaign.currency,
    });
  } catch (e) {
    return NextResponse.json(
      { valid: false, error: e instanceof Error ? e.message : "Validation failed" },
      { status: 500 }
    );
  }
}
