import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = sanitizeText(body.name);
    const email = sanitizeText(body.email);
    const phone = sanitizeText(body.phone);
    const subject = sanitizeText(body.subject);
    const message = sanitizeText(body.message);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error: "Database connection not configured",
          details:
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("inquiries")
      .insert([
        {
          name,
          email,
          phone: phone || null,
          subject,
          message,
          status: "new",
          source: "contact_form",
        },
      ])
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error saving inquiry:", error);
      const isMissingTable =
        error.message?.includes("does not exist") ||
        error.code === "42P01";
      return NextResponse.json(
        {
          error: isMissingTable
            ? "Inquiries table not set up. Run ticketing_voting_mvp_patch_09_inquiries.sql in Supabase SQL Editor."
            : "Failed to save your message",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      created_at: data.created_at,
      message: "Inquiry submitted successfully",
    });
  } catch (err: unknown) {
    console.error("Contact API error:", err);
    return NextResponse.json(
      { error: "An error occurred while submitting your message" },
      { status: 500 }
    );
  }
}
