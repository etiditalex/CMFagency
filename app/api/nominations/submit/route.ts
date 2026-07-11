import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";
import {
  isModelNominationCategory,
  MODEL_NOMINATION_EVENT_SLUG,
} from "@/lib/model-nominations";

export const runtime = "nodejs";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const nomineeName = sanitizeText(String((body as { nominee_name?: string }).nominee_name ?? ""));
    const nomineeEmailRaw = sanitizeText(
      String((body as { nominee_email?: string }).nominee_email ?? "")
    ).toLowerCase();
    const nomineeEmail = nomineeEmailRaw || null;
    const nomineePhone =
      sanitizeText(String((body as { nominee_phone?: string }).nominee_phone ?? "")) || null;
    const nomineeInstagram =
      sanitizeText(String((body as { nominee_instagram?: string }).nominee_instagram ?? "")) ||
      null;
    const category = sanitizeText(String((body as { category?: string }).category ?? ""));
    const reason = sanitizeText(String((body as { reason?: string }).reason ?? ""));
    const confirmNotSelf = Boolean((body as { confirm_not_self?: boolean }).confirm_not_self);

    if (!nomineeName || !category || !reason) {
      return NextResponse.json(
        {
          error: "Nominee name, category, and reason are required.",
        },
        { status: 400 }
      );
    }

    if (nomineeEmail && !isValidEmail(nomineeEmail)) {
      return NextResponse.json({ error: "Invalid nominee email address." }, { status: 400 });
    }

    if (!isModelNominationCategory(category)) {
      return NextResponse.json(
        { error: "Please select Top 10 Male Models or Top 10 Female Models." },
        { status: 400 }
      );
    }

    if (!confirmNotSelf) {
      return NextResponse.json(
        { error: "You must confirm that you are nominating someone else, not yourself." },
        { status: 400 }
      );
    }

    if (reason.length < 20) {
      return NextResponse.json(
        {
          error:
            "Please share a bit more about why this model should be nominated (at least 20 characters).",
        },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error: "Database connection not configured",
          details: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from("model_nominations")
      .insert([
        {
          event_slug: MODEL_NOMINATION_EVENT_SLUG,
          nominator_name: null,
          nominator_email: null,
          nominator_phone: null,
          nominee_name: nomineeName,
          nominee_email: nomineeEmail,
          nominee_phone: nomineePhone,
          nominee_instagram: nomineeInstagram,
          category,
          reason,
          status: "new",
          source: "nominate_form",
        },
      ])
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error saving nomination:", error);
      const isMissingTable =
        error.message?.includes("does not exist") || error.code === "42P01";
      const isNotNull =
        error.message?.toLowerCase().includes("null value") ||
        error.code === "23502";
      return NextResponse.json(
        {
          error: isMissingTable
            ? "Nominations table not set up. Run database/ticketing_voting_mvp_patch_81_model_nominations.sql in Supabase SQL Editor."
            : isNotNull
              ? "Nominations schema needs an update. Run database/ticketing_voting_mvp_patch_82_model_nominations_optional_nominator.sql in Supabase SQL Editor."
              : "Failed to save nomination",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      created_at: data.created_at,
      message: "Nomination submitted successfully",
    });
  } catch (err: unknown) {
    console.error("Nominations submit API error:", err);
    return NextResponse.json(
      { error: "An error occurred while submitting the nomination" },
      { status: 500 }
    );
  }
}
