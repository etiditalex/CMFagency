import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIVE_AGENT_NAME = "Alex";

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { data: pm } = await supabaseAnon
      .from("portal_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: au } = await supabaseAnon.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
    const isAdmin = (pm?.role === "admin" || pm?.role === "manager") || !!au;
    if (!isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { conversationId } = body;
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Changer not configured" }, { status: 500 });
    }

    const { data: conv, error: fetchErr } = await supabaseAdmin
      .from("changer_conversations")
      .select("id, session_id, visitor_email, visitor_name")
      .eq("id", conversationId)
      .single();

    if (fetchErr || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("changer_conversations")
      .update({
        status: "live_agent",
        live_agent_name: LIVE_AGENT_NAME,
        live_agent_picked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateErr) {
      console.error("Changer agent pickup update:", updateErr);
      return NextResponse.json({ error: "Failed to pick up" }, { status: 500 });
    }

    // Record in handoff log (admin dashboard only)
    await supabaseAdmin.from("changer_handoff_log").insert({
      conversation_id: conversationId,
      live_agent_name: LIVE_AGENT_NAME,
      picked_by_user_id: user.id,
    });

    // Add system message so the user sees "Alex has joined"
    await supabaseAdmin.from("changer_messages").insert({
      conversation_id: conversationId,
      role: "live_agent",
      content: `${LIVE_AGENT_NAME} has joined the conversation. How can I help you?`,
    });

    return NextResponse.json({
      success: true,
      message: "You have picked up this conversation. The visitor will be notified.",
    });
  } catch (err: unknown) {
    console.error("Changer agent-pickup error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
