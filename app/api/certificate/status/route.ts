import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveContestantForCertificate } from "@/lib/contestant-certificate-lookup";

/**
 * Public: certificate status by full name (as in database) + email + category slug.
 * Email must match the registration when we have it on file; otherwise it is saved for delivery.
 */
export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const campaignSlug = searchParams.get("campaign_slug")?.trim();

  if (!name || !email || !campaignSlug) {
    return NextResponse.json(
      { error: "name, email, and campaign_slug are required" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: campaign, error: campErr } = await supabase
    .from("campaigns")
    .select("id,title")
    .eq("slug", campaignSlug)
    .eq("type", "vote")
    .maybeSingle();

  if (campErr || !campaign) {
    return NextResponse.json(
      { found: false, approved: false, downloaded_at: null, error: "Category not found" },
      { status: 200 }
    );
  }

  const campaignId = (campaign as { id: string }).id;
  const categoryTitle = (campaign as { title?: string }).title ?? "";

  const resolved = await resolveContestantForCertificate(supabase, campaignId, name, email);
  if (!resolved.ok) {
    return NextResponse.json({
      found: false,
      approved: false,
      downloaded_at: null,
      category_title: categoryTitle,
      error: resolved.message,
    });
  }

  const c = resolved.contestant;

  try {
    await supabase
      .from("contestants")
      .update({ certificate_requested_at: new Date().toISOString() })
      .eq("id", c.id);
  } catch {
    // Column may not exist until patch is applied; keep endpoint non-blocking.
  }

  return NextResponse.json({
    found: true,
    contestant_id: c.id,
    name: c.name,
    approved: !!c.certificate_approved_at,
    downloaded_at: c.certificate_downloaded_at ?? null,
    category_title: categoryTitle,
  });
}
