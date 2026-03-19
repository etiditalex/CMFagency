import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public: check certificate status for a contestant by email + campaign_slug.
 * Used on register-as-model page so contestants can see if they can download.
 */
export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const campaignSlug = searchParams.get("campaign_slug")?.trim();

  if (!email || !campaignSlug) {
    return NextResponse.json(
      { error: "email and campaign_slug are required" },
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
    return NextResponse.json({ found: false, error: "Category not found" }, { status: 200 });
  }

  const campaignId = (campaign as { id: string }).id;

  const { data: contestant, error } = await supabase
    .from("contestants")
    .select("id,name,certificate_approved_at,certificate_downloaded_at")
    .eq("campaign_id", campaignId)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!contestant) {
    return NextResponse.json({
      found: false,
      approved: false,
      downloaded_at: null,
      category_title: (campaign as { title?: string }).title ?? undefined,
    });
  }

  const c = contestant as {
    id: string;
    name: string;
    certificate_approved_at: string | null;
    certificate_downloaded_at: string | null;
  };

  // Mark that the contestant has requested/checked certificate status.
  // This powers admin notifications in Fusion Xpress dashboard.
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
    category_title: (campaign as { title?: string }).title ?? undefined,
  });
}
