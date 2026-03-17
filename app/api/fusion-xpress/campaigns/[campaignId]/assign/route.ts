import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST: Assign a campaign to a client (admin only). Uses service role so the update always succeeds.
 * Body: { user_id: string } — the portal member's user_id (auth.users.id) to assign as campaign owner.
 * After this, the campaign and its stats appear in that client's dashboard.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    if (!campaignId) return NextResponse.json({ error: "Missing campaign id" }, { status: 400 });

    let body: { user_id?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const targetUserId = String(body?.user_id ?? "").trim();
    if (!targetUserId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    const callerId = String(callerData.user.id ?? "");
    const { data: memberRow } = await admin.from("portal_members").select("role").eq("user_id", callerId).maybeSingle();
    const isFullAdmin = memberRow?.role === "admin";
    const isLegacyAdmin = !memberRow
      ? (await admin.from("admin_users").select("user_id").eq("user_id", callerId).maybeSingle()).data != null
      : false;
    if (!isFullAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: "Forbidden: full admin only" }, { status: 403 });
    }

    const { data: targetMember } = await admin
      .from("portal_members")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (!targetMember) {
      return NextResponse.json({ error: "Target user is not a portal member" }, { status: 400 });
    }

    const { error: updateErr } = await admin
      .from("campaigns")
      .update({ created_by: targetUserId })
      .eq("id", campaignId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Campaign assigned to client. It will now appear in their dashboard." });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
