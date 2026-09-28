import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { KCM_FORUM_CAPACITY } from "@/lib/kenya-coast-models";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ capacity: KCM_FORUM_CAPACITY, taken: 0, remaining: KCM_FORUM_CAPACITY });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { count, error } = await admin
    .from("kenya_coast_models_registrations")
    .select("id", { count: "exact", head: true })
    .eq("payment_status", "success");
  if (error) {
    return NextResponse.json({ capacity: KCM_FORUM_CAPACITY, taken: 0, remaining: KCM_FORUM_CAPACITY });
  }
  const taken = count ?? 0;
  return NextResponse.json({
    capacity: KCM_FORUM_CAPACITY,
    taken,
    remaining: Math.max(0, KCM_FORUM_CAPACITY - taken),
  });
}
