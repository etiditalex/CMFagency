import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHANGER_EMAIL = "changerfusions@gmail.com";
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "CMF Agency <onboarding@resend.dev>";

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, visitorName, visitorEmail, visitorContact, inquiryType } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Changer is not configured." },
        { status: 500 }
      );
    }

    const { data: conv, error: fetchErr } = await supabaseAdmin
      .from("changer_conversations")
      .select("id, visitor_name, visitor_email, created_at")
      .eq("session_id", sessionId)
      .single();

    if (fetchErr || !conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("changer_conversations")
      .update({
        status: "waiting_for_agent",
        visitor_name: visitorName || conv.visitor_name,
        visitor_email: visitorEmail || conv.visitor_email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conv.id);

    if (updateErr) {
      console.error("Changer handoff update:", updateErr);
      return NextResponse.json({ error: "Failed to request live agent" }, { status: 500 });
    }

    // Fetch recent messages for context
    const { data: messages } = await supabaseAdmin
      .from("changer_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const summary = messages
      ?.map((m) => `[${m.role}]: ${m.content}`)
      .join("\n")
      .slice(0, 1500);

    const inquiryLabel = { support: "Support", billing: "Billing", technical: "Technical" }[inquiryType as string] || inquiryType || "General";

    // Email to changerfusions@gmail.com
    if (resendApiKey) {
      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 1.5rem;">Changer - Live Agent Request</h1>
  </div>
  <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px;">
    <p><strong>A visitor has requested a live agent.</strong></p>
    <p>Please log in to Fusion Xpress and pick up this conversation in the Changer section.</p>
    <p>Visitor: ${visitorName || conv.visitor_name || "Unknown"}</p>
    <p>Email: ${visitorEmail || conv.visitor_email || "—"}</p>
    <p>Contact: ${visitorContact || "—"}</p>
    <p>Inquiry type: ${inquiryLabel}</p>
    <p>Session ID: ${sessionId}</p>
    <hr>
    <p><strong>Conversation summary:</strong></p>
    <pre style="background: white; padding: 12px; border: 1px solid #ddd; border-radius: 6px; overflow-x: auto; font-size: 12px;">${(summary || "No messages yet").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
    <p style="margin-top: 20px;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke"}/dashboard/changer" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Open Changer in Fusion Xpress</a></p>
  </div>
  <p style="color: #666; font-size: 11px; margin-top: 24px;">Changer · CMF Agency</p>
</body>
</html>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: CHANGER_EMAIL,
          subject: `Changer: Live agent requested - ${visitorName || conv.visitor_name || "Visitor"}`,
          html,
        }),
      }).catch((e) => console.error("Changer handoff email error:", e));
    }

    return NextResponse.json({
      success: true,
      message: "A live agent has been notified. Alex will join your conversation shortly.",
    });
  } catch (err: unknown) {
    console.error("Changer handoff error:", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
