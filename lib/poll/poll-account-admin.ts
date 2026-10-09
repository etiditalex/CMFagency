import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { checkPollVerifyRateLimit, getClientIp } from "@/lib/rate-limit";

export function pollAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || supabaseUrl.includes("placeholder.supabase.co")) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return (data?.users ?? []).find((user) => user.email?.toLowerCase() === email) ?? null;
}

export function rateLimited(req: NextRequest) {
  const { allowed, retryAfter } = checkPollVerifyRateLimit(getClientIp(req));
  if (allowed) return null;
  return NextResponse.json(
    { error: "Too many attempts. Try again later.", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter ?? 900) } },
  );
}
