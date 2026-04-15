import { NextResponse } from "next/server";
import { getKcmAdminClient } from "@/lib/kcm-member-auth";
import { getKcmRegistrationFeeKes } from "@/lib/kcm-registration-fee";

/**
 * Public: current KCM membership registration fee in KES (for the marketing page and payment UI).
 */
export async function GET() {
  try {
    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    const registration_fee_kes = await getKcmRegistrationFeeKes(admin);
    return NextResponse.json({ registration_fee_kes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
