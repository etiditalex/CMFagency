import { SupabaseClient } from "@supabase/supabase-js";

export type CouponResult = {
  valid: true;
  coupon_id: string;
  discount_amount: number;
  unit_amount: number;
  amount: number;
} | { valid: false; error: string };

/**
 * Validates a coupon code for a campaign and returns discounted amount.
 * Uses service-role client to read coupons.
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  campaign: { id: string; created_by: string; unit_amount: number },
  code: string,
  quantity: number
): Promise<CouponResult> {
  const codeTrim = code.trim();
  if (!codeTrim) return { valid: false, error: "Code is required" };

  const { data: coupon, error: couponErr } = await supabase
    .from("coupons")
    .select("id,discount_type,discount_value,campaign_id,created_by,is_active,max_uses,used_count,valid_from,valid_until")
    .eq("is_active", true)
    .ilike("code", codeTrim)
    .maybeSingle();

  if (couponErr || !coupon) return { valid: false, error: "Invalid or expired code" };

  const couponOwnerId = coupon.created_by as string;
  const campaignOwnerId = campaign.created_by;
  const ownerMatch = couponOwnerId === campaignOwnerId;
  if (!ownerMatch) {
    const { data: pm } = await supabase
      .from("portal_members")
      .select("role")
      .eq("user_id", couponOwnerId)
      .maybeSingle();
    const { data: au } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", couponOwnerId)
      .maybeSingle();
    const isCouponCreatorAdmin =
      (pm && ((pm as { role?: string }).role === "admin" || (pm as { role?: string }).role === "manager")) || !!au;
    if (!isCouponCreatorAdmin) {
      return { valid: false, error: "Invalid or expired code" };
    }
  }

  if (coupon.campaign_id != null && coupon.campaign_id !== campaign.id) {
    return { valid: false, error: "This code is not valid for this event" };
  }
  if (coupon.max_uses != null && (coupon.used_count ?? 0) >= coupon.max_uses) {
    return { valid: false, error: "This code has reached its usage limit" };
  }
  const now = new Date().toISOString();
  if (coupon.valid_from && now < coupon.valid_from) {
    return { valid: false, error: "This code is not yet valid" };
  }
  if (coupon.valid_until && now > coupon.valid_until) {
    return { valid: false, error: "This code has expired" };
  }

  const unitAmount = Math.round(Number(campaign.unit_amount));
  const subtotal = unitAmount * quantity;
  let discountAmount: number;
  if (coupon.discount_type === "percent") {
    discountAmount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
  } else {
    discountAmount = Math.round(Math.min(Number(coupon.discount_value) * quantity, subtotal));
  }
  discountAmount = Math.min(discountAmount, subtotal);
  const amount = Math.round(Math.max(0, subtotal - discountAmount));
  const finalDiscount = subtotal - amount;

  return {
    valid: true,
    coupon_id: coupon.id,
    discount_amount: finalDiscount,
    unit_amount: unitAmount,
    amount,
  };
}
