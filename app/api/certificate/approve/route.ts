import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Dashboard admin: approve a contestant to download their participation certificate.
 * Requires authenticated portal member with access to the contestant's campaign.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized: missing session" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized: invalid or expired session" }, { status: 401 });
  }

  let body: { contestant_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contestantId = body.contestant_id?.trim();
  if (!contestantId) {
    return NextResponse.json({ error: "contestant_id is required" }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // Verify contestant exists and get campaign for RLS check
  const { data: contestant, error: fetchErr } = await supabase
    .from("contestants")
    .select("id,campaign_id")
    .eq("id", contestantId)
    .single();

  if (fetchErr || !contestant) {
    return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
  }

  // Use user's Supabase client so RLS applies (portal member must have access to campaign)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: updated, error: updateErr } = await userClient
    .from("contestants")
    .update({
      certificate_approved_at: new Date().toISOString(),
      certificate_approved_by: user.id,
    })
    .eq("id", contestantId)
    .select("id,certificate_approved_at")
    .single();

  if (updateErr) {
    if (updateErr.code === "PGRST116" || String(updateErr.message).includes("row-level")) {
      return NextResponse.json(
        { error: "You do not have permission to approve certificates for this contestant." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    contestant_id: (updated as { id: string }).id,
    certificate_approved_at: (updated as { certificate_approved_at?: string }).certificate_approved_at,
  });
}
