import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clampIdealApplicationFeeKes, IDEAL_APPLICATION_FEE_DEFAULT_KES } from "@/lib/ideal-mr-miss";

export function idealApplicationFeeAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Current Kenya's Ideal Mr & Miss application fee (KES).
 * Falls back to {@link IDEAL_APPLICATION_FEE_DEFAULT_KES} if settings are missing.
 */
export async function getIdealApplicationFeeKes(admin?: SupabaseClient | null): Promise<number> {
  const client = admin ?? idealApplicationFeeAdmin();
  if (!client) return IDEAL_APPLICATION_FEE_DEFAULT_KES;
  const { data, error } = await client
    .from("ideal_mr_miss_settings")
    .select("application_fee_kes")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return IDEAL_APPLICATION_FEE_DEFAULT_KES;
  return clampIdealApplicationFeeKes((data as { application_fee_kes?: number }).application_fee_kes);
}
