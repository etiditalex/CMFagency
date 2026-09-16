import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sanitizeText } from "@/lib/sanitize";

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

    const name = sanitizeText(String((body as { name?: string }).name ?? "")).slice(0, 120);
    const email = sanitizeText(String((body as { email?: string }).email ?? "")).toLowerCase();
    const review = sanitizeText(String((body as { review?: string }).review ?? "")).slice(0, 2000);
    const eventSlug = sanitizeText(String((body as { event_slug?: string }).event_slug ?? "")).slice(0, 180);
    const eventTitle = sanitizeText(String((body as { event_title?: string }).event_title ?? "")).slice(0, 200);
    const ratingRaw = Number((body as { rating?: number }).rating);
    const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, Math.round(ratingRaw))) : 5;

    if (!name || !review) {
      return NextResponse.json({ error: "Name and review are required." }, { status: 400 });
    }
    if (review.length < 20) {
      return NextResponse.json({ error: "Please share a little more about your experience." }, { status: 400 });
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Database connection not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabase.from("testimonials").insert({
      name,
      role: eventTitle ? `Guest, ${eventTitle}` : "Event guest",
      quote: review,
      image_url: "",
      rating,
      event_slug: eventSlug || null,
      event_title: eventTitle || null,
      reviewer_email: email || null,
      source: "event_review",
      show_on_home: true,
      show_on_testimonials_page: true,
      is_active: true,
      sort_order: 0,
    });

    if (error) {
      const msg = String(error.message ?? "").toLowerCase();
      if (error.code === "42P01" || (msg.includes("testimonials") && msg.includes("does not exist"))) {
        return NextResponse.json(
          { error: "Testimonials are not set up yet. Run the testimonials SQL patch in Supabase." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Could not save your review. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not save your review. Please try again." }, { status: 500 });
  }
}
