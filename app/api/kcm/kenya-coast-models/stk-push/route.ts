import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchDarajaAccessToken } from "@/lib/daraja-oauth";
import {
  buildDarajaStkPassword,
  buildStkAccountReference,
  darajaStkTimestamp,
  describeStkPushFailure,
  isStkPushAccepted,
  parseMpesaBusinessShortCode,
  resolveStkTransactionType,
  type StkPushJson,
} from "@/lib/daraja-stk-config";
import { isValidKenyaPhone, normalizeKenyaPhone } from "@/lib/kenya-phone";
import { KENYA_COUNTY_DEFINITIONS } from "@/lib/kenya-counties";
import { KCM_FORUM_CAPACITY } from "@/lib/kenya-coast-models";
import { getKcmFeeSettings } from "@/lib/kcm-registration-fee";
import { findApprovedMemberByEmail, findApprovedMemberByNumber } from "@/lib/kenya-coast-models-membership";
import { discardUnpaidForumRegistration } from "@/lib/kcm-unpaid-registration";
import { sanitizeText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

type Body = {
  fullName?: string;
  phoneCalls?: string;
  phoneWhatsapp?: string;
  email?: string;
  town?: string;
  county?: string;
  isMember?: boolean;
  attendeeType?: string;
  modelLevel?: string;
  brandName?: string;
  mpesaPhone?: string;
  membershipNumber?: string;
  experience?: string;
};

const ATTENDEE = new Set(["model", "designer", "guest"]);
const MODEL_LEVEL = new Set(["emerging", "professional"]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const fullName = sanitizeText(body.fullName);
    const phoneCalls = normalizeKenyaPhone(String(body.phoneCalls ?? ""));
    const phoneWhatsapp = normalizeKenyaPhone(String(body.phoneWhatsapp ?? ""));
    const email = sanitizeText(body.email).toLowerCase();
    const town = sanitizeText(body.town);
    const county = sanitizeText(body.county);
    const isMember = body.isMember === true;
    const attendeeType = sanitizeText(body.attendeeType);
    const modelLevel = sanitizeText(body.modelLevel);
    const brandName = sanitizeText(body.brandName);
    const mpesaPhone = normalizeKenyaPhone(String(body.mpesaPhone || body.phoneCalls || ""));
    const experience = sanitizeText(body.experience);

    if (!fullName || !town || !KENYA_COUNTY_DEFINITIONS.some((item) => item.label === county)) {
      return NextResponse.json({ error: "Enter your name, town, and a Kenyan county." }, { status: 400 });
    }
    if (!isValidKenyaPhone(phoneCalls) || !isValidKenyaPhone(phoneWhatsapp)) {
      return NextResponse.json({ error: "Enter valid Kenya phone and WhatsApp numbers." }, { status: 400 });
    }
    if (!isValidKenyaPhone(mpesaPhone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa number for the payment prompt." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address, or leave it blank." }, { status: 400 });
    }
    if (!ATTENDEE.has(attendeeType)) {
      return NextResponse.json({ error: "Choose how you will attend." }, { status: 400 });
    }
    if (attendeeType === "model" && !MODEL_LEVEL.has(modelLevel)) {
      return NextResponse.json({ error: "Choose emerging or professional model." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Registration payments are not available yet." }, { status: 500 });
    }

    const shortCode = parseMpesaBusinessShortCode(process.env.MPESA_SHORTCODE);
    const passKey = process.env.MPESA_PASSKEY;
    if (!shortCode || !passKey) {
      return NextResponse.json({ error: "M-Pesa credentials are not configured." }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const fees = await getKcmFeeSettings(admin);
    let membershipId: string | null = null;
    let membershipNumber: string | null = null;
    let feeKes = fees.forumNonMemberFeeKes;
    if (isMember) {
      const found = await findApprovedMemberByNumber(admin, body.membershipNumber);
      if (!found.member) {
        return NextResponse.json({ error: found.error || "Membership number not found." }, { status: 400 });
      }
      membershipId = found.member.id;
      membershipNumber = found.member.membershipNumber;
      feeKes = fees.forumMemberFeeKes;
      const { count: already } = await admin
        .from("kenya_coast_models_registrations")
        .select("id", { count: "exact", head: true })
        .eq("membership_id", membershipId)
        .eq("payment_status", "success");
      if ((already ?? 0) > 0) {
        return NextResponse.json({ error: "This membership number is already registered for the forum." }, { status: 409 });
      }
    } else {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Enter an email address. New members receive their membership number by email after approval." },
          { status: 400 }
        );
      }
      if (experience.trim().length < 2) {
        return NextResponse.json({ error: "Tell us a little about your experience so we can register your membership." }, { status: 400 });
      }
      const existingMember = await findApprovedMemberByEmail(admin, email);
      if (existingMember) {
        return NextResponse.json(
          {
            error: `This email already belongs to member ${existingMember.membershipNumber}. Choose Member and enter that number to pay KES ${fees.forumMemberFeeKes}.`,
          },
          { status: 409 }
        );
      }
    }

    const { count, error: countErr } = await admin
      .from("kenya_coast_models_registrations")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "success");
    if (countErr) {
      const missing = countErr.code === "42P01" || countErr.message.includes("does not exist");
      return NextResponse.json(
        {
          error: missing
            ? "Forum registration is not set up yet. Run database/ticketing_voting_mvp_patch_94_kenya_coast_models_registrations.sql in Supabase."
            : countErr.message,
        },
        { status: 500 }
      );
    }
    if ((count ?? 0) >= KCM_FORUM_CAPACITY) {
      return NextResponse.json({ error: "Attendance is full. This forum is limited to 100 guests." }, { status: 409 });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("kenya_coast_models_registrations")
      .insert({
        full_name: fullName,
        phone_calls: phoneCalls,
        phone_whatsapp: phoneWhatsapp,
        email: email || null,
        town,
        county,
        is_member: isMember,
        membership_id: membershipId,
        membership_number: membershipNumber,
        experience: isMember ? null : experience,
        attendee_type: attendeeType,
        model_level: attendeeType === "model" ? modelLevel : null,
        brand_name: attendeeType === "designer" ? brandName || null : null,
        fee_kes: feeKes,
        payment_status: "pending",
        payment_confirmed: false,
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      const missingColumn = insertErr?.code === "42703" || (insertErr?.message ?? "").includes("membership_id");
      return NextResponse.json(
        {
          error: missingColumn
            ? "Forum membership linking is not set up yet. Run database/ticketing_voting_mvp_patch_95_kenya_coast_models_membership_link.sql in Supabase."
            : (insertErr?.message ?? "Could not start registration."),
        },
        { status: 500 }
      );
    }

    const registrationId = String((inserted as { id: string }).id);
    const token = await fetchDarajaAccessToken();
    if (!token.ok) {
      await discardUnpaidForumRegistration(admin, registrationId);
      return NextResponse.json({ error: token.error }, { status: 502 });
    }

    const baseUrl = (process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke").replace(/\/$/, "");
    const stkPushUrl = process.env.MPESA_STKPUSH_URL ?? `${baseUrl}/mpesa/stkpush/v1/processrequest`;
    const timestamp = darajaStkTimestamp();
    const callbackBase = `${process.env.NEXT_PUBLIC_SITE_URL ?? req.headers.get("origin") ?? ""}`.replace(/\/$/, "");
    const callbackUrl = `${callbackBase || "https://cmfagency.co.ke"}/api/kcm/kenya-coast-models/daraja-callback`;

    const stkRes = await fetch(stkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: buildDarajaStkPassword(shortCode, passKey, timestamp),
        Timestamp: timestamp,
        TransactionType: resolveStkTransactionType(),
        Amount: feeKes,
        PartyA: mpesaPhone,
        PartyB: shortCode,
        PhoneNumber: mpesaPhone,
        CallBackURL: callbackUrl,
        AccountReference: buildStkAccountReference(registrationId),
        TransactionDesc: "KCM Forum",
      }),
    });
    const stkJson = (await stkRes.json().catch(() => ({}))) as StkPushJson;
    if (!stkRes.ok || !isStkPushAccepted(stkJson)) {
      const reason = describeStkPushFailure(stkJson, stkRes.status);
      await discardUnpaidForumRegistration(admin, registrationId);
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    await admin
      .from("kenya_coast_models_registrations")
      .update({
        daraja_checkout_request_id: stkJson.CheckoutRequestID,
        daraja_merchant_request_id: stkJson.MerchantRequestID ?? null,
      })
      .eq("id", registrationId);

    return NextResponse.json({
      registration_id: registrationId,
      fee_kes: feeKes,
      message: "Payment prompt sent. Complete payment on your phone before continuing.",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
