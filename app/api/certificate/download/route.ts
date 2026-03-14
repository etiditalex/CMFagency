import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCertificatePdf } from "@/lib/certificate-pdf";

/**
 * Public: download certificate PDF for an approved contestant.
 * Body: { email, campaign_slug }. Verifies contestant exists and is approved,
 * then generates PDF with name/category/date/e-sign, records download, returns PDF.
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  let body: { email?: string; campaign_slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const campaignSlug = body.campaign_slug?.trim();

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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const campaignId = (campaign as { id: string }).id;
  const campaignTitle = (campaign as { title?: string }).title ?? "CMFA";

  const { data: contestant, error: contErr } = await supabase
    .from("contestants")
    .select("id,name,certificate_approved_at")
    .eq("campaign_id", campaignId)
    .ilike("email", email)
    .maybeSingle();

  if (contErr) {
    return NextResponse.json({ error: contErr.message }, { status: 500 });
  }

  if (!contestant) {
    return NextResponse.json({ error: "No contestant found for this email and category." }, { status: 404 });
  }

  const c = contestant as {
    id: string;
    name: string;
    certificate_approved_at: string | null;
  };

  if (!c.certificate_approved_at) {
    return NextResponse.json(
      { error: "Certificate download is not yet approved. Please wait for admin approval." },
      { status: 403 }
    );
  }

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generateCertificatePdf({
      participantName: c.name,
      categoryTitle: campaignTitle,
      date: dateStr,
    });
  } catch (e) {
    console.error("Certificate PDF generation failed:", e);
    return NextResponse.json(
      { error: "Failed to generate certificate. Please try again later." },
      { status: 500 }
    );
  }

  // Record download timestamp
  await supabase
    .from("contestants")
    .update({ certificate_downloaded_at: new Date().toISOString() })
    .eq("id", c.id);

  const filename = `CMFA-Certificate-${c.name.replace(/[^a-zA-Z0-9-_]/g, "-")}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
