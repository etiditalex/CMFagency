import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { APPLICATION_DOCS_BUCKET } from "@/lib/application-documents";
import {
  IDEAL_EVENT_DATE_LABEL,
  IDEAL_EVENT_VENUE,
  categoryLabel,
  contestantCardPath,
  makeApplicationCode,
  titleLabel,
  type ContestantCardData,
} from "@/lib/ideal-mr-miss";
import { fromEmail, resend } from "@/lib/resend";
import { escapeHtml, sanitizeText } from "@/lib/sanitize";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const EVENT_ON = new Date("2026-12-12T00:00:00+03:00");
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/jpg"]);

type Category = "kids" | "teens" | "adults";
type ApplyingAs = "mr" | "miss";

function ageOnEvent(isoDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const dob = new Date(`${isoDate}T00:00:00+03:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = EVENT_ON.getFullYear() - dob.getFullYear();
  const month = EVENT_ON.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && EVENT_ON.getDate() < dob.getDate())) age -= 1;
  return age;
}

function expectedBand(category: Category): [number, number] {
  if (category === "kids") return [7, 12];
  if (category === "teens") return [13, 17];
  return [18, 25];
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function yesNo(value: FormDataEntryValue | null): boolean | null {
  const raw = String(value ?? "");
  if (raw === "yes") return true;
  if (raw === "no") return false;
  return null;
}

function siteOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://cmfagency.co.ke";
}

async function emailApplicationId(to: string, card: ContestantCardData, cardUrl: string): Promise<boolean> {
  if (!resend) return false;
  const title = escapeHtml(titleLabel(card.applyingAs));
  const safeName = escapeHtml(card.fullName);
  const safeCode = escapeHtml(card.applicationCode);
  const safeTown = escapeHtml(card.townCounty);
  const safeUrl = escapeHtml(cardUrl);
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Your Kenya’s Ideal Mr & Miss application ID ${card.applicationCode}`,
      html: `<p>Hello ${safeName},</p>
<p>Your application for Kenya’s Ideal Mr &amp; Miss 2026 has been received.</p>
<p><strong>Application ID:</strong> ${safeCode}<br>
<strong>Title:</strong> ${title}<br>
<strong>Category:</strong> ${escapeHtml(categoryLabel(card.category))}<br>
<strong>Town and county:</strong> ${safeTown}<br>
<strong>Venue:</strong> ${IDEAL_EVENT_VENUE}<br>
<strong>Event date:</strong> ${IDEAL_EVENT_DATE_LABEL}</p>
<p>Open your application card here: <a href="${safeUrl}">${safeUrl}</a></p>
<p>The registration fee is KES 500. Submitting an application does not guarantee selection. Changer Fusions will contact you with payment and participation instructions.</p>`,
    });
    if (error) {
      console.error("ideal mr miss email:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("ideal mr miss email:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const fullName = sanitizeText(form.get("fullName"));
    const dateOfBirth = sanitizeText(form.get("dateOfBirth"));
    const category = sanitizeText(form.get("category")) as Category;
    const applyingAs = sanitizeText(form.get("applyingAs")) as ApplyingAs;
    const townCounty = sanitizeText(form.get("townCounty"));
    const phoneCalls = sanitizeText(form.get("phoneCalls"));
    const phoneWhatsapp = sanitizeText(form.get("phoneWhatsapp"));
    const email = sanitizeText(form.get("email"));
    const guardianName = sanitizeText(form.get("guardianName"));
    const guardianRelationship = sanitizeText(form.get("guardianRelationship"));
    const guardianPhone = sanitizeText(form.get("guardianPhone"));
    const guardianEmail = sanitizeText(form.get("guardianEmail"));
    const institution = sanitizeText(form.get("institution"));
    const about = sanitizeText(form.get("about"));
    const whyParticipate = sanitizeText(form.get("whyParticipate"));
    const talent = sanitizeText(form.get("talent"));
    const modelsForEducation = sanitizeText(form.get("modelsForEducation"));
    const priorEventName = sanitizeText(form.get("priorEventName"));
    const priorEvent = yesNo(form.get("priorEvent"));
    const available = yesNo(form.get("available"));
    const marketingConsent = yesNo(form.get("marketingConsent"));
    const accuracy = form.get("accuracy") === "on" || form.get("accuracy") === "true";
    const fee = form.get("fee") === "on" || form.get("fee") === "true";
    const contact = form.get("contact") === "on" || form.get("contact") === "true";
    const guardianConsent = form.get("guardianConsent") === "on" || form.get("guardianConsent") === "true";
    const photo = form.get("photo");

    if (!fullName || !dateOfBirth || !townCounty || !about || !whyParticipate || !talent || !modelsForEducation) {
      return NextResponse.json({ error: "Please complete every required field." }, { status: 400 });
    }
    if (category !== "kids" && category !== "teens" && category !== "adults") {
      return NextResponse.json({ error: "Choose a category." }, { status: 400 });
    }
    if (applyingAs !== "mr" && applyingAs !== "miss") {
      return NextResponse.json({ error: "Choose Mr or Miss." }, { status: 400 });
    }

    const age = ageOnEvent(dateOfBirth);
    if (age == null) {
      return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
    }
    const [minAge, maxAge] = expectedBand(category);
    if (age < minAge || age > maxAge) {
      return NextResponse.json(
        { error: "Date of birth does not match the selected category on 12 December 2026." },
        { status: 400 }
      );
    }

    const minor = age < 18;
    if (minor && (!guardianName || !guardianRelationship || !guardianPhone || !guardianConsent)) {
      return NextResponse.json(
        { error: "Parent or guardian details and consent are required for contestants under 18." },
        { status: 400 }
      );
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid contestant email address." }, { status: 400 });
    }
    if (guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) {
      return NextResponse.json({ error: "Enter a valid guardian email address." }, { status: 400 });
    }

    const aboutWords = wordCount(about);
    if (aboutWords < 50 || aboutWords > 100) {
      return NextResponse.json({ error: "Tell us about yourself in 50 to 100 words." }, { status: 400 });
    }
    if (priorEvent == null || available == null || marketingConsent == null) {
      return NextResponse.json({ error: "Answer the yes or no questions." }, { status: 400 });
    }
    if (!accuracy || !fee || !contact) {
      return NextResponse.json({ error: "Confirm the required declarations." }, { status: 400 });
    }
    if (!(photo instanceof File) || photo.size === 0) {
      return NextResponse.json({ error: "Upload one recent, clear photo." }, { status: 400 });
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: "The photo must be 5MB or smaller." }, { status: 400 });
    }
    const mime = photo.type || "image/jpeg";
    if (!IMAGE_TYPES.has(mime)) {
      return NextResponse.json({ error: "Upload a JPG, PNG, or WebP photo." }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Applications are not available yet. Missing Supabase service configuration." },
        { status: 500 }
      );
    }

    const id = crypto.randomUUID();
    const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const photoPath = `ideal-mr-miss/${id}/${Date.now()}_${safeName}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    const uploaded = await supabaseAdmin.storage.from(APPLICATION_DOCS_BUCKET).upload(photoPath, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (uploaded.error) {
      console.error("ideal mr miss photo upload:", uploaded.error.message);
      return NextResponse.json({ error: "Could not store the photo. Please try again." }, { status: 500 });
    }

    let applicationCode = makeApplicationCode();
    let saved: { created_at: string } | null = null;
    let error: { code?: string; message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const inserted = await supabaseAdmin
        .from("ideal_mr_miss_applications")
        .insert({
      id,
      application_code: applicationCode,
      full_name: fullName,
      date_of_birth: dateOfBirth,
      category,
      applying_as: applyingAs,
      town_county: townCounty,
      phone_calls: phoneCalls || null,
      phone_whatsapp: phoneWhatsapp || null,
      email: email || null,
      guardian_name: minor ? guardianName : guardianName || null,
      guardian_relationship: minor ? guardianRelationship : guardianRelationship || null,
      guardian_phone: minor ? guardianPhone : guardianPhone || null,
      guardian_email: guardianEmail || null,
      institution: institution || null,
      about,
      why_participate: whyParticipate,
      talent,
      models_for_education: modelsForEducation,
      photo_path: photoPath,
      prior_event: priorEvent,
      prior_event_name: priorEvent ? priorEventName || null : null,
      available,
      accuracy_confirmed: true,
      fee_acknowledged: true,
      contact_agreed: true,
      guardian_consent: minor ? true : null,
      marketing_consent: marketingConsent,
    })
        .select("created_at")
        .single();
      saved = inserted.data;
      error = inserted.error;
      if (!error || error.code !== "23505") break;
      applicationCode = makeApplicationCode();
    }

    if (error) {
      console.error("ideal mr miss insert:", error.message);
      const missing = error.code === "42P01" || error.message.includes("does not exist");
      return NextResponse.json(
        {
          error: missing
            ? "Application storage is not set up yet. Run database/ticketing_voting_mvp_patch_92_ideal_mr_miss_applications.sql in Supabase."
            : "Could not save the application. Please try again.",
        },
        { status: 500 }
      );
    }

    const card: ContestantCardData = {
      applicationCode,
      fullName,
      applyingAs,
      category,
      townCounty,
      issuedOn: saved?.created_at ?? new Date().toISOString(),
    };
    const recipient = email || guardianEmail || null;
    const cardUrl = `${siteOrigin(request)}${contestantCardPath(applicationCode)}`;
    const emailed = recipient ? await emailApplicationId(recipient, card, cardUrl) : false;

    return NextResponse.json({ ok: true, card, emailedTo: emailed ? recipient : null });
  } catch (error) {
    console.error("ideal mr miss apply:", error);
    return NextResponse.json({ error: "Could not submit the application." }, { status: 500 });
  }
}
