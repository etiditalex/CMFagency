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
    const { conversationId, content } = body;
    const text = String(content || "").trim().slice(0, 4000);
    if (!conversationId || !text) {
      return NextResponse.json({ error: "conversationId and content required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Changer not configured" }, { status: 500 });
    }

    const { data: conv, error: fetchErr } = await supabaseAdmin
      .from("changer_conversations")
      .select("id, status")
      .eq("id", conversationId)
      .single();

    if (fetchErr || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conv.status !== "live_agent") {
      return NextResponse.json({ error: "Pick up the conversation first to send messages" }, { status: 400 });
    }

    const { error: insErr } = await supabaseAdmin.from("changer_messages").insert({
      conversation_id: conversationId,
      role: "live_agent",
      content: text,
    });

    if (insErr) {
      console.error("Changer agent message:", insErr);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Changer agent-message error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
