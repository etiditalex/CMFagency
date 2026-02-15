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
      .select("id, session_id, status, live_agent_name, live_agent_picked_at, handoff_requested_at, agent_timeout_notified, created_at")
      .eq("session_id", sessionId)
      .single();

    if (convErr && convErr.code !== "PGRST116") {
      console.error("Changer conversation fetch:", convErr);
      return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
    }

    if (!conv) {
      return NextResponse.json({ conversation: null, messages: [] });
    }

    // 2-min timeout: if waiting_for_agent and no response, notify user with WhatsApp/call fallback
    const TIMEOUT_MS = 2 * 60 * 1000;
    const now = Date.now();
    const handoffAt = conv.handoff_requested_at ? new Date(conv.handoff_requested_at).getTime() : 0;

    if (
      conv.status === "waiting_for_agent" &&
      handoffAt > 0 &&
      now - handoffAt >= TIMEOUT_MS &&
      !conv.agent_timeout_notified
    ) {
      const fallbackMessage =
        "Our live agent is not available at the moment. Here's how you can get help:\n\n" +
        "📞 Call us: +254 797 777347\n" +
        "📱 WhatsApp: https://wa.me/254797777347 (open to chat)\n\n" +
        "We'll get back to you as soon as possible. You can also continue chatting with me below for general questions.";

      await supabaseAdmin.from("changer_messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: fallbackMessage,
      });

      await supabaseAdmin.from("changer_conversations").update({
        status: "bot",
        agent_timeout_notified: true,
        updated_at: new Date().toISOString(),
      }).eq("id", conv.id);

      (conv as { status: string }).status = "bot";
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
