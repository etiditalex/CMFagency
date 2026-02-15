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

const LIVE_AGENT_KEYWORDS = [
  "live agent", "real person", "human", "speak to someone", "talk to agent",
  "talk to a person", "speak to agent", "connect with agent", "human agent",
  "customer service", "support agent", "transfer to agent", "hand me over",
  "speak with someone", "get help from a person", "need a human",
  "want to talk to someone", "can i speak to", "connect me to",
];

function wantsLiveAgent(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return LIVE_AGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

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
    const { sessionId, message, visitorName, visitorEmail, visitorContact, inquiryType } = body;
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

    // If user requests a live agent, trigger handoff and indicate transfer
    if (wantsLiveAgent(content)) {
      const transferMessage = "Transferring you to a live agent now. Alex will be with you shortly. Please hold...";
      await supabaseAdmin.from("changer_conversations").update({
        status: "waiting_for_agent",
        visitor_name: visitorName || undefined,
        visitor_email: visitorEmail || undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", conv.id);

      await supabaseAdmin.from("changer_messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: transferMessage,
      });

      // Send email to changerfusions@gmail.com (handoff notification)
      const resendApiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <onboarding@resend.dev>";
      if (resendApiKey) {
        const { data: msgs } = await supabaseAdmin
          .from("changer_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(15);
        const summary = msgs?.map((m) => `[${m.role}]: ${m.content}`).join("\n").slice(0, 1200) || "";
        const CHANGER_EMAIL = "changerfusions@gmail.com";
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: fromEmail,
            to: CHANGER_EMAIL,
            subject: `Changer: Live agent requested - ${visitorName || "Visitor"}`,
            html: `<p>A visitor requested a live agent. Visitor: ${visitorName || "—"} | ${visitorEmail || "—"} | ${visitorContact || "—"}</p><p>Inquiry: ${inquiryType || "—"}</p><pre>${summary.replace(/</g, "&lt;")}</pre><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke"}/dashboard/changer">Open Changer</a></p>`,
          }),
        }).catch((e) => console.error("Changer handoff email:", e));
      }

      return NextResponse.json({
        success: true,
        message: transferMessage,
        role: "assistant",
        handoffTriggered: true,
      });
    }

    const knowledgeContext = await getKnowledgeContext(content);

    const systemPrompt = `You are Changer, the friendly AI assistant for CMF Agency (Changer Fusions), a marketing and events agency in Kenya. You help visitors with:

**Bookings & Events**: Event registration, ticket purchases for Coast Fashion and Modelling Awards (CMFA), upcoming events. Tickets can be bought via the "Buy Ticket Online" button on event pages. Payment is through Paystack (card, mobile money).

**Voting**: CMF Agency runs voting campaigns. Visitors can vote for nominees. Voting pages are linked from events and campaigns. Guide users to the relevant event or voting page.

**Ticketing**: Event tickets (Regular, VIP, VVIP) are sold through Fusion Xpress. Prices and availability vary by event. Direct users to /events/upcoming for current events.

**Services**: Digital marketing, website development, branding, market research, events marketing, content creation.

**Careers & Merchandise**: Jobs, internships, talent programs, branded merchandise (T-shirts, hoodies, etc.).

Be helpful, professional, and concise. Answer questions about bookings, voting, ticketing, events, services, and careers using the website content below when available.
${knowledgeContext}

When users ask for a human, live agent, or real person, respond: "I'm transferring you to a live agent now. Alex will be with you shortly." The system will automatically handle the transfer.`;

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
        ? `Based on our website content, I can help with bookings, voting, ticketing, events, services, and careers. For detailed support, visit /events/upcoming for tickets, or click "Talk to a live agent" to connect with Alex.`
        : `Hello! I'm Changer. I can help with bookings, voting, ticketing, events, services, and careers. Visit /events/upcoming for event tickets. For a live agent, click the button below or type "I need a live agent".`;

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
