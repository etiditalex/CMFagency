import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";
import {
  isModelNominationCategory,
  MODEL_NOMINATION_EVENT_SLUG,
  normalizeNomineeName,
} from "@/lib/model-nominations";

export const runtime = "nodejs";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function deviceFingerprint(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const ip = clientIp(req);
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex");
}

function isUniqueViolation(error: { code?: string; message?: string }): boolean {
  if (error.code === "23505") return true;
  const m = (error.message ?? "").toLowerCase();
  return (
    m.includes("model_nominations_device_nominee_uniq") ||
    m.includes("duplicate key")
  );
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
    const deviceId = sanitizeText(String((body as { device_id?: string }).device_id ?? "")).slice(
      0,
      128
    );

    if (!nomineeName || !category || !reason) {
      return NextResponse.json(
        { error: "Nominee name, category, and reason are required." },
        { status: 400 }
      );
    }

    if (!deviceId || deviceId.length < 8) {
      return NextResponse.json(
        { error: "Unable to verify your device. Please refresh the page and try again." },
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

    const nomineeNameNormalized = normalizeNomineeName(nomineeName);
    const fingerprint = deviceFingerprint(request);

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

    // Explicit duplicate check (clearer error than unique index alone)
    const { data: existingByDevice } = await supabase
      .from("model_nominations")
      .select("id")
      .eq("device_id", deviceId)
      .eq("event_slug", MODEL_NOMINATION_EVENT_SLUG)
      .eq("category", category)
      .eq("nominee_name_normalized", nomineeNameNormalized)
      .limit(1)
      .maybeSingle();

    if (existingByDevice) {
      return NextResponse.json(
        {
          error:
            "You have already nominated this person in this category from this device. Each person can only be nominated once per device.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("model_nominations")
      .insert([
        {
          event_slug: MODEL_NOMINATION_EVENT_SLUG,
          nominator_name: null,
          nominator_email: null,
          nominator_phone: null,
          nominee_name: nomineeName,
          nominee_name_normalized: nomineeNameNormalized,
          nominee_email: nomineeEmail,
          nominee_phone: nomineePhone,
          nominee_instagram: nomineeInstagram,
          category,
          reason,
          status: "new",
          source: "nominate_form",
          device_id: deviceId,
          device_fingerprint: fingerprint,
        },
      ])
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error saving nomination:", error);
      if (isUniqueViolation(error)) {
        return NextResponse.json(
          {
            error:
              "You have already nominated this person in this category from this device. Each person can only be nominated once per device.",
          },
          { status: 409 }
        );
      }
      const isMissingTable =
        error.message?.includes("does not exist") || error.code === "42P01";
      const isMissingColumn =
        error.message?.toLowerCase().includes("device_id") ||
        error.message?.toLowerCase().includes("nominee_name_normalized") ||
        error.code === "42703";
      return NextResponse.json(
        {
          error: isMissingTable
            ? "Nominations table not set up. Run database/ticketing_voting_mvp_patch_81_model_nominations.sql in Supabase SQL Editor."
            : isMissingColumn
              ? "Nominations schema needs an update. Run database/ticketing_voting_mvp_patch_83_model_nominations_device_unique.sql in Supabase SQL Editor."
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
