import { NextRequest, NextResponse } from "next/server";

import { resendKcmRegistrationEmail } from "@/lib/kcm-membership-approve";
import { requireFusionKcmMembershipAccess } from "@/lib/fusion-require-admin";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFusionKcmMembershipAccess(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing membership id." }, { status: 400 });

    const result = await resendKcmRegistrationEmail(admin, id);
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 });
    }
    if (result.error === "payment_required") {
      return NextResponse.json(
        { error: "A registration ID is emailed only after a successful payment." },
        { status: 400 }
      );
    }
    if (!result.ok || !result.emailed) {
      return NextResponse.json(
        { error: "Could not send the registration ID email. Check the member email and try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      membership_number: result.membershipNumber,
      emailed: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
