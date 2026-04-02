import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initiateB2C } from "@/lib/daraja-b2c";
import { getWalletSupabasePublicEnv, parseBearerToken } from "@/lib/wallet-request-auth";

/**
 * Admin approves a withdrawal request. Sets status to 'approved', triggers M-Pesa B2C,
 * then sets status to 'processing'. Callback updates to 'completed' or 'rejected'.
 */
async function getAdminUser(
  req: Request,
  env: { supabaseUrl: string; supabaseAnonKey: string }
): Promise<{ id: string } | null> {
  const token = parseBearerToken(req);
  if (!token) return null;

  const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: pm } = await supabase.from("portal_members").select("role").eq("user_id", user.id).maybeSingle();
  const isAdmin = pm?.role === "admin";
  const { data: au } = !pm ? await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle() : { data: null };
  if (!isAdmin && !au) return null;

  return { id: user.id };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const env = getWalletSupabasePublicEnv();
  if (!env) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const auth = await getAdminUser(req, env);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { action?: "approve" | "reject" };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }
  const action = (body.action ?? "approve").toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: wr, error: fetchErr } = await supabase
      .from("withdrawal_requests")
      .select("id,amount,recipient_phone,status,created_by")
      .eq("id", id)
      .single();

    if (fetchErr || !wr) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    // Reject: allowed for pending_admin, and for processing/approved (admin revert when B2C fails)
    if (action === "reject") {
      const allowedForReject = ["pending_admin", "approved", "processing"];
      if (!allowedForReject.includes(wr.status)) {
        return NextResponse.json(
          { error: `Cannot reject - request is ${wr.status}` },
          { status: 400 }
        );
      }
      const { error: updErr } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          approved_by: auth.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updErr) throw updErr;
      return NextResponse.json({
        status: "rejected",
        message: wr.status !== "pending_admin"
          ? "Withdrawal reverted. Balance restored."
          : "Withdrawal rejected",
      });
    }

    // Approve: only when pending_admin
    if (wr.status !== "pending_admin") {
      return NextResponse.json(
        { error: `Cannot approve - request is already ${wr.status}` },
        { status: 400 }
      );
    }

    // Approve first
    const { error: updErr } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "approved",
        approved_by: auth.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updErr) throw updErr;

    // Trigger M-Pesa B2C
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? "https://cmfagency.co.ke";
    const base = String(siteUrl).replace(/\/$/, "");
    const resultUrl = `${base}/api/daraja/b2c-callback`;
    const queueTimeoutUrl = resultUrl;

    const b2cResult = await initiateB2C({
      amount: wr.amount,
      recipientPhone: wr.recipient_phone,
      remarks: `Withdrawal ${id.slice(0, 8)}`,
      withdrawalId: id,
      resultUrl,
      queueTimeoutUrl,
    });

    if (!b2cResult.ok) {
      // Store failure in metadata for debugging, revert status so balance restores
      await supabase
        .from("withdrawal_requests")
        .update({
          status: "pending_admin",
          approved_by: null,
          approved_at: null,
          metadata: { b2c_error: b2cResult.error },
        })
        .eq("id", id);
      return NextResponse.json(
        {
          error: b2cResult.error,
          status: "b2c_failed",
          hint: "Check MPESA_B2C_* env vars. See DARAJA_B2C_TROUBLESHOOTING.md",
        },
        { status: 502 }
      );
    }

    // Mark as processing and store conversation IDs for callback matching
    await supabase
      .from("withdrawal_requests")
      .update({
        status: "processing",
        metadata: {
          conversation_id: b2cResult.conversationId,
          originator_conversation_id: b2cResult.originatorConversationId,
        },
      })
      .eq("id", id);

    return NextResponse.json({
      status: "processing",
      message: "Withdrawal approved. M-Pesa payout initiated. Status will update when Safaricom confirms.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Approval failed" },
      { status: 500 }
    );
  }
}
