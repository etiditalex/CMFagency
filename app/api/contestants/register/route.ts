import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fromEmail } from "@/lib/resend";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Public model registration: create a contestant for an active voting campaign
 * and send them their voting campaign link by email.
 * No auth required (public registration).
 */
export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
    }

    const formData = await req.formData();
    const campaignSlug = (formData.get("campaign_slug") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const photo = formData.get("photo") as File | null;

    if (!campaignSlug || !name || !email) {
      return NextResponse.json(
        { error: "Campaign category, name, and email are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id,slug,title,type,is_active")
      .eq("slug", campaignSlug)
      .maybeSingle();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    if ((campaign as { type?: string }).type !== "vote") {
      return NextResponse.json({ error: "This category is not open for model registration." }, { status: 400 });
    }

    if (!(campaign as { is_active?: boolean }).is_active) {
      return NextResponse.json({ error: "This category is not currently accepting registrations." }, { status: 400 });
    }

    let imageUrl: string | null = null;
    if (photo && photo instanceof File && photo.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(photo.type)) {
        return NextResponse.json(
          { error: `Invalid photo type. Use: ${ALLOWED_IMAGE_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      if (photo.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: "Photo too large. Max 5MB." }, { status: 400 });
      }
      const buffer = Buffer.from(await photo.arrayBuffer());
      const base64 = buffer.toString("base64");
      imageUrl = `data:${photo.type};base64,${base64}`;
    }

    const campaignId = (campaign as { id: string }).id;
    const campaignTitle = (campaign as { title?: string }).title ?? "Voting";
    const emailLower = email.trim().toLowerCase();

    // No duplicate in same category: same name or same email can only register once per category.
    const { data: existingByName } = await supabase
      .from("contestants")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("name", name)
      .maybeSingle();

    if (existingByName) {
      return NextResponse.json(
        { error: "A contestant with this name is already registered in this category. Use a different name or category." },
        { status: 409 }
      );
    }

    // Block same email registering twice in the same category (they can register in other categories).
    const { data: existingByEmail, error: emailCheckErr } = await supabase
      .from("contestants")
      .select("id")
      .eq("campaign_id", campaignId)
      .ilike("email", emailLower)
      .maybeSingle();

    if (!emailCheckErr && existingByEmail) {
      return NextResponse.json(
        { error: "This email is already registered in this category. You can register in other categories, but only once per category." },
        { status: 409 }
      );
    }
    // If emailCheckErr is "column does not exist", we skip the check; duplicate-by-email still blocked by name or by DB constraint once patch 36 is applied.

    let contestant: { id: string } | null = null;
    const insertPayload = {
      campaign_id: campaignId,
      name,
      email: email.toLowerCase(),
      image_url: imageUrl,
      sort_order: 0,
    };
    const { data: inserted, error: insertErr } = await supabase
      .from("contestants")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertErr) {
      const msg = String(insertErr.message ?? "").toLowerCase();
      const missingEmailColumn = msg.includes("contestants.email") && (msg.includes("does not exist") || msg.includes("column"));
      if (missingEmailColumn) {
        const { data: fallback, error: fallbackErr } = await supabase
          .from("contestants")
          .insert({
            campaign_id: campaignId,
            name,
            image_url: imageUrl,
            sort_order: 0,
          })
          .select("id")
          .single();
        if (fallbackErr) {
          return NextResponse.json(
            { error: fallbackErr.message ?? "Registration failed. Please try again." },
            { status: 500 }
          );
        }
        contestant = fallback;
      } else {
        return NextResponse.json(
          { error: insertErr.message ?? "Registration failed. Please try again." },
          { status: 500 }
        );
      }
    } else {
      contestant = inserted;
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const votingLink = `${origin}/${campaignSlug}`;

    if (resendApiKey) {
      const subject = `Your voting campaign link – ${campaignTitle}`;
      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #111;">You're registered!</h2>
          <p>Hi ${name.replace(/</g, "&lt;")},</p>
          <p>You're now registered as a contestant in <strong>${campaignTitle.replace(/</g, "&lt;")}</strong>.</p>
          <p>Share your voting link so people can vote for you:</p>
          <p style="margin: 24px 0;">
            <a href="${votingLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Open voting page</a>
          </p>
          <p style="word-break: break-all; color: #666; font-size: 14px;">${votingLink}</p>
          <p style="margin-top: 32px; color: #666; font-size: 14px;">Good luck!</p>
          <p style="color: #999; font-size: 12px;">CMF Agency</p>
        </div>
      `;

      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: email,
            subject,
            html,
          }),
        });
      } catch {
        // Non-fatal: contestant is created; admin can resend link from dashboard later
      }

      try {
        if (contestant?.id) {
          await supabase
            .from("contestants")
            .update({ voting_link_sent_at: new Date().toISOString() })
            .eq("id", contestant.id);
        }
      } catch {
        // Column may not exist until patch 34 is applied
      }
    }

    return NextResponse.json({
      success: true,
      message: "You're registered! Check your email for your voting campaign link.",
      voting_link: votingLink,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
