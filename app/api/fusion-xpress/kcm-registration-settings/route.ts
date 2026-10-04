import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { clampKcmRegistrationFeeKes, getKcmFeeSettings } from "@/lib/kcm-registration-fee";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const fees = await getKcmFeeSettings(admin);
    return NextResponse.json({
      registration_fee_kes: fees.registrationFeeKes,
      forum_member_fee_kes: fees.forumMemberFeeKes,
      forum_non_member_fee_kes: fees.forumNonMemberFeeKes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type Body = {
  registration_fee_kes?: unknown;
  forum_member_fee_kes?: unknown;
  forum_non_member_fee_kes?: unknown;
};

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = (await req.json().catch(() => ({}))) as Body;
    const current = await getKcmFeeSettings(admin);
    const registration_fee_kes =
      body.registration_fee_kes === undefined
        ? current.registrationFeeKes
        : clampKcmRegistrationFeeKes(body.registration_fee_kes);
    const forum_member_fee_kes =
      body.forum_member_fee_kes === undefined
        ? current.forumMemberFeeKes
        : clampKcmRegistrationFeeKes(body.forum_member_fee_kes);
    const forum_non_member_fee_kes =
      body.forum_non_member_fee_kes === undefined
        ? current.forumNonMemberFeeKes
        : clampKcmRegistrationFeeKes(body.forum_non_member_fee_kes);

    const { error } = await admin.from("kcm_registration_settings").upsert(
      {
        id: 1,
        registration_fee_kes,
        forum_member_fee_kes,
        forum_non_member_fee_kes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      const missing = error.code === "42703" || error.message.includes("forum_");
      return NextResponse.json(
        {
          error: missing
            ? "Forum fees are not set up yet. Run database/kcm_forum_fees_patch.sql in Supabase."
            : error.message,
        },
        { status: missing ? 400 : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      registration_fee_kes,
      forum_member_fee_kes,
      forum_non_member_fee_kes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
