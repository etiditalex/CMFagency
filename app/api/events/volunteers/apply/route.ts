import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  creativeAreaLabel,
  isCreativeAreaId,
  isKfcaaRegion,
  isKnownCounty,
  isPlausiblePhone,
  makeVolunteerCode,
  regionForCounty,
  roleLabel,
  type VolunteerRole,
} from "@/lib/kfcaa-volunteers";
import { checkVolunteerApplyRateLimit, getClientIp } from "@/lib/rate-limit";
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

const MIN_STORY = 40;

function checked(value: unknown): boolean {
  return value === true || value === "true" || value === "on";
}

function story(value: unknown): string {
  return sanitizeText(value);
}

async function emailApplication(to: string, fullName: string, code: string, role: VolunteerRole, area: string) {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Your KFCAA volunteer application ${code}`,
      html: `<p>Hello ${escapeHtml(fullName)},</p>
<p>Your application to volunteer with the Kenya Fashion and Creative Arts Awards has been received.</p>
<p><strong>Application number:</strong> ${escapeHtml(code)}<br>
<strong>Role:</strong> ${escapeHtml(roleLabel(role))}<br>
<strong>Area:</strong> ${escapeHtml(area)}</p>
<p>This is a volunteer opportunity. Submitting an application does not guarantee selection. Changer Fusions will contact you using the details you provided.</p>`,
    });
    if (error) {
      console.error("kfcaa volunteer email:", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("kfcaa volunteer email:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkVolunteerApplyRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many applications from this network. Try again later.", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter ?? 3600) } }
      );
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid application." }, { status: 400 });

    const fullName = sanitizeText(body.fullName);
    const phone = sanitizeText(body.phone);
    const whatsapp = sanitizeText(body.whatsapp);
    const email = sanitizeText(body.email).toLowerCase();
    const town = sanitizeText(body.town);
    const residenceCounty = sanitizeText(body.residenceCounty);
    const currentRole = sanitizeText(body.currentRole);
    const role = sanitizeText(body.role);
    const regionInput = sanitizeText(body.region);
    const representCounty = sanitizeText(body.representCounty);
    const whyApply = story(body.whyApply);
    const communityExperience = story(body.communityExperience);
    const howPromote = story(body.howPromote);
    const rawAreas = Array.isArray(body.creativeAreas) ? body.creativeAreas : [];
    const creativeAreas = [...new Set(rawAreas.map((item) => sanitizeText(item)).filter(isCreativeAreaId))];

    if (!fullName || !town || !isKnownCounty(residenceCounty)) {
      return NextResponse.json({ error: "Complete your name, town, and county of residence." }, { status: 400 });
    }
    if (!isPlausiblePhone(phone) || !isPlausiblePhone(whatsapp)) {
      return NextResponse.json({ error: "Enter a valid phone number and WhatsApp number." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (role !== "regional" && role !== "county") {
      return NextResponse.json({ error: "Choose regional or county representative." }, { status: 400 });
    }

    let region: string | null = null;
    let county: string | null = null;
    if (role === "regional") {
      if (!isKfcaaRegion(regionInput)) {
        return NextResponse.json({ error: "Choose the region you want to represent." }, { status: 400 });
      }
      region = regionInput;
    } else {
      if (!isKnownCounty(representCounty)) {
        return NextResponse.json({ error: "Choose the county you want to represent." }, { status: 400 });
      }
      county = representCounty;
      region = regionForCounty(representCounty);
      if (!region) {
        return NextResponse.json({ error: "Choose the county you want to represent." }, { status: 400 });
      }
    }

    if (creativeAreas.length === 0) {
      return NextResponse.json({ error: "Choose at least one creative area." }, { status: 400 });
    }
    if (whyApply.length < MIN_STORY || communityExperience.length < MIN_STORY || howPromote.length < MIN_STORY) {
      return NextResponse.json(
        { error: "Tell us a little more about why you are applying, your community, and how you would promote KFCAA." },
        { status: 400 }
      );
    }
    if (!checked(body.accuracy) || !checked(body.volunteer) || !checked(body.contact) || !checked(body.updates)) {
      return NextResponse.json({ error: "Confirm the required declarations." }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Applications are not available yet. Missing Supabase service configuration." },
        { status: 500 }
      );
    }

    const id = crypto.randomUUID();
    let applicationCode = makeVolunteerCode();
    let error: { code?: string; message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const inserted = await supabaseAdmin.from("kfcaa_volunteer_applications").insert({
        id,
        application_code: applicationCode,
        full_name: fullName,
        phone,
        whatsapp,
        email,
        town,
        residence_county: residenceCounty,
        present_role: currentRole || null,
        role,
        region,
        represent_county: county,
        creative_areas: creativeAreas,
        why_apply: whyApply,
        community_experience: communityExperience,
        how_promote: howPromote,
        accuracy_confirmed: true,
        volunteer_acknowledged: true,
        contact_agreed: true,
        updates_committed: true,
      });
      error = inserted.error;
      if (!error || error.code !== "23505") break;
      applicationCode = makeVolunteerCode();
    }

    if (error) {
      console.error("kfcaa volunteer insert:", error.message);
      const missing = error.code === "42P01" || error.message.includes("does not exist");
      return NextResponse.json(
        {
          error: missing
            ? "Volunteer applications are not set up yet. Run database/ticketing_voting_mvp_patch_103_kfcaa_volunteer_applications.sql in Supabase."
            : "Could not save the application. Please try again.",
        },
        { status: 500 }
      );
    }

    const area = role === "regional" ? `${region} region` : county || "";
    const emailed = await emailApplication(email, fullName, applicationCode, role, area);
    return NextResponse.json({
      ok: true,
      applicationCode,
      emailedTo: emailed ? email : null,
      areaLabel: creativeAreas.map(creativeAreaLabel).join(", "),
    });
  } catch (error) {
    console.error("kfcaa volunteer apply:", error);
    return NextResponse.json({ error: "Could not submit the application." }, { status: 500 });
  }
}
