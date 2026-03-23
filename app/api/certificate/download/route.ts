import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateCertificatePdf } from "@/lib/certificate-pdf";
import { resolveContestantForCertificate } from "@/lib/contestant-certificate-lookup";

/**
 * Public: download certificate PDF for an approved contestant.
 * Body: { name, email, campaign_slug }. Same matching rules as GET /api/certificate/status.
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  let body: { name?: string; email?: string; campaign_slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const campaignSlug = body.campaign_slug?.trim();

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
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const campaignId = (campaign as { id: string }).id;
  const campaignTitle = (campaign as { title?: string }).title ?? "CMFA";

  const resolved = await resolveContestantForCertificate(supabase, campaignId, name, email);
  if (!resolved.ok) {
    const status = resolved.code === "ambiguous" ? 409 : 404;
    return NextResponse.json({ error: resolved.message }, { status });
  }

  const c = resolved.contestant;

  if (!c.certificate_approved_at) {
    return NextResponse.json(
      { error: "Certificate download is not yet approved. Please wait for admin approval." },
      { status: 403 }
    );
  }

  // One-time only: certificate may be sent by email on approval or downloaded once
  if (c.certificate_downloaded_at) {
    return NextResponse.json(
      { error: "This certificate has already been issued (sent by email or downloaded). It can only be received once." },
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
