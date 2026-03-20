import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignRow } from "@/lib/ensure-cfma-campaigns";
import { JOB_BOARD_MEMBERSHIP_SLUG } from "@/lib/job-board-access";

const MEMBERSHIP_AMOUNT_KES = 500;

/**
 * Ensures the M-Pesa campaign for annual job-board membership exists (KES 500, slug job-board-membership).
 */
export async function ensureJobBoardMembershipCampaign(
  supabaseAdmin: SupabaseClient
): Promise<CampaignRow | null> {
  const slug = JOB_BOARD_MEMBERSHIP_SLUG;
  const { data: existing } = await supabaseAdmin
    .from("campaigns")
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn,is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    const row = existing as CampaignRow & { is_active?: boolean };
    return row as CampaignRow;
  }

  let adminId: string | null = null;
  try {
    const { data: pm } = await supabaseAdmin
      .from("portal_members")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    if (pm?.user_id) adminId = pm.user_id as string;
    if (!adminId) {
      const { data: au } = await supabaseAdmin
        .from("admin_users")
        .select("user_id")
        .limit(1)
        .maybeSingle();
      if (au?.user_id) adminId = au.user_id as string;
    }
  } catch (e) {
    console.warn("ensureJobBoardMembershipCampaign: could not fetch admin", e);
  }

  if (!adminId) {
    console.warn("ensureJobBoardMembershipCampaign: No admin user found to own campaign.");
    return null;
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      type: "ticket",
      slug,
      title: "Job board — annual membership",
      description:
        "One year of access to paid job and contract listings on the Changer Fusions job board. Internship and attachment listings remain free.",
      currency: "KES",
      unit_amount: MEMBERSHIP_AMOUNT_KES,
      max_per_txn: 1,
      is_active: true,
      created_by: adminId,
    })
    .select("id,created_by,type,slug,title,currency,unit_amount,max_per_txn")
    .single();

  if (error) {
    console.error("ensureJobBoardMembershipCampaign: insert failed", error);
    return null;
  }

  return inserted as CampaignRow;
}
