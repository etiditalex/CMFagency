import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { getIdealApplicationFeeKes } from "@/lib/ideal-mr-miss-fee";
import { clampIdealApplicationFeeKes } from "@/lib/ideal-mr-miss";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const application_fee_kes = await getIdealApplicationFeeKes(auth.admin);
    return NextResponse.json({ application_fee_kes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type Body = { application_fee_kes?: unknown };

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = (await req.json().catch(() => ({}))) as Body;
    const application_fee_kes = clampIdealApplicationFeeKes(body.application_fee_kes);

    const { error } = await admin.from("ideal_mr_miss_settings").upsert(
      {
        id: 1,
        application_fee_kes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) {
      const missing = error.code === "42P01" || error.message.includes("does not exist");
      return NextResponse.json(
        {
          error: missing
            ? "Application fee storage is not set up yet. Run database/ticketing_voting_mvp_patch_93_ideal_mr_miss_application_fee.sql in Supabase."
            : error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, application_fee_kes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
