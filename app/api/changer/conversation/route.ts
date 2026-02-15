import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Changer not configured" }, { status: 500 });
    }

    const { data: conv, error: convErr } = await supabaseAdmin
      .from("changer_conversations")
      .select("id, session_id, status, live_agent_name, live_agent_picked_at, created_at")
      .eq("session_id", sessionId)
      .single();

    if (convErr && convErr.code !== "PGRST116") {
      console.error("Changer conversation fetch:", convErr);
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
    }

    if (!conv) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from("changer_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("Changer messages fetch:", msgErr);
    }

    return NextResponse.json({
      conversation: conv,
      messages: messages ?? [],
    });
  } catch (err: unknown) {
    console.error("Changer conversation error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
