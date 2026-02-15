import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

async function getKnowledgeContext(query: string): Promise<string> {
  if (!supabaseAdmin) return "";
  const { data } = await supabaseAdmin
    .from("changer_knowledge")
    .select("title, content_text")
    .order("updated_at", { ascending: false })
    .limit(10);
  if (!data?.length) return "";
  const parts = data.map((r) => `[${r.title || "Content"}]\n${r.content_text}`).join("\n\n---\n\n");
  return `\n\nRelevant website content (use this to answer accurately):\n${parts}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, visitorName, visitorEmail } = body;
    const content = String(message || "").trim().slice(0, 2000);

    if (!sessionId || !content) {
      return NextResponse.json({ error: "sessionId and message required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Changer is not configured. Database connection missing." },
        { status: 500 }
      );
    }

    // Get or create conversation
    let { data: conv } = await supabaseAdmin
      .from("changer_conversations")
      .select("id, status, live_agent_name")
      .eq("session_id", sessionId)
      .single();

    if (!conv) {
      const { data: newConv, error: insErr } = await supabaseAdmin
        .from("changer_conversations")
        .insert({
          session_id: sessionId,
          status: "bot",
          visitor_name: visitorName || null,
          visitor_email: visitorEmail || null,
        })
        .select("id, status, live_agent_name")
        .single();
      if (insErr) {
        console.error("Changer insert conversation:", insErr);
        return NextResponse.json({ error: "Failed to start conversation" }, { status: 500 });
      }
      conv = newConv as { id: string; status: string; live_agent_name: string | null };
    }

    // If live agent has picked, don't use AI
    if (conv.status === "live_agent") {
      const { error: msgErr } = await supabaseAdmin.from("changer_messages").insert({
        conversation_id: conv.id,
        role: "user",
        content,
      });
      if (msgErr) console.error("Changer message insert:", msgErr);
      return NextResponse.json({
        success: true,
        message: "Your message has been sent. Alex will respond shortly.",
        role: "live_agent",
      });
    }

    if (conv.status === "waiting_for_agent") {
      const { error: msgErr } = await supabaseAdmin.from("changer_messages").insert({
        conversation_id: conv.id,
        role: "user",
        content,
      });
      if (msgErr) console.error("Changer message insert:", msgErr);
      return NextResponse.json({
        success: true,
        message: "Your message has been received. A live agent will assist you shortly. We've notified our team.",
        role: "assistant",
      });
    }

    // Save user message
    await supabaseAdmin.from("changer_messages").insert({
      conversation_id: conv.id,
      role: "user",
      content,
    });

    const knowledgeContext = await getKnowledgeContext(content);

    const systemPrompt = `You are Changer, the friendly AI assistant for CMF Agency (Changer Fusions), a marketing and events agency in Kenya. You help visitors with inquiries about services, events, careers, merchandise, and general information.

Be helpful, professional, and concise. If you don't know something, suggest they contact the team or request a live agent.
${knowledgeContext}

When users ask for a human, live agent, or real person, tell them they can click "Talk to a live agent" and someone named Alex will assist them.`;

    if (openaiKey) {
      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });
      const responseText = text.trim().slice(0, 4000);
      if (responseText) {
        await supabaseAdmin.from("changer_messages").insert({
          conversation_id: conv.id,
          role: "assistant",
          content: responseText,
        });
      }
      return NextResponse.json({
        success: true,
        message: responseText,
        role: "assistant",
      });
    }

    // Fallback: simple response using knowledge
    const fallbackMessage =
      knowledgeContext.length > 50
        ? `Based on our website content, I'd be glad to help. For detailed questions about our services, events, or careers, please visit our contact page or click "Talk to a live agent" to connect with Alex, our support team member.`
        : `Hello! I'm Changer, your CMF Agency assistant. I can help with general questions about our services, events, and careers. For specific inquiries, you can request a live agent (Alex) by clicking the button below.`;

    await supabaseAdmin.from("changer_messages").insert({
      conversation_id: conv.id,
      role: "assistant",
      content: fallbackMessage,
    });

    return NextResponse.json({
      success: true,
      message: fallbackMessage,
      role: "assistant",
    });
  } catch (err: unknown) {
    console.error("Changer chat error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
