import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findApprovedMemberByNumber } from "@/lib/kenya-coast-models-membership";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { membershipNumber?: string };
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Membership lookup is not available yet." }, { status: 500 });
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const found = await findApprovedMemberByNumber(admin, body.membershipNumber);
    if (!found.member) {
      return NextResponse.json({ error: found.error || "Membership number not found." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      membershipNumber: found.member.membershipNumber,
      firstName: found.member.firstName,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
