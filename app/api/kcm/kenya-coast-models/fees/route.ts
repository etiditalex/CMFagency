import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  KCM_FORUM_MEMBER_FEE_DEFAULT_KES,
  KCM_FORUM_NON_MEMBER_FEE_DEFAULT_KES,
  getKcmFeeSettings,
} from "@/lib/kcm-registration-fee";

export const dynamic = "force-dynamic";

/** Public forum attendance fees used by the Kenya Coast Models registration form. */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        forum_member_fee_kes: KCM_FORUM_MEMBER_FEE_DEFAULT_KES,
        forum_non_member_fee_kes: KCM_FORUM_NON_MEMBER_FEE_DEFAULT_KES,
      });
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const fees = await getKcmFeeSettings(admin);
    return NextResponse.json({
      forum_member_fee_kes: fees.forumMemberFeeKes,
      forum_non_member_fee_kes: fees.forumNonMemberFeeKes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
