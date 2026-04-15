import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { clampKcmRegistrationFeeKes, getKcmRegistrationFeeKes } from "@/lib/kcm-registration-fee";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const registration_fee_kes = await getKcmRegistrationFeeKes(admin);
    return NextResponse.json({ registration_fee_kes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type Body = { registration_fee_kes?: unknown };

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = (await req.json().catch(() => ({}))) as Body;
    const registration_fee_kes = clampKcmRegistrationFeeKes(body.registration_fee_kes);

    const { error } = await admin.from("kcm_registration_settings").upsert(
      {
        id: 1,
        registration_fee_kes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, registration_fee_kes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
