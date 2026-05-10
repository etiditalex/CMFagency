import { NextRequest, NextResponse } from "next/server";

import { requireFusionKcmMembershipAccess } from "@/lib/fusion-require-admin";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireFusionKcmMembershipAccess(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { data: memberships, error: mErr } = await admin
      .from("kcm_memberships")
      .select("payment_status,payment_confirmed,payment_amount_kes");
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    const { data: walletRows, error: wErr } = await admin
      .from("kcm_member_wallet_transactions")
      .select("amount_kes,status");
    if (wErr) return NextResponse.json({ error: wErr.message }, { status: 500 });

    let totalMembershipPaidKes = 0;
    let membershipPaidCount = 0;
    for (const row of (memberships ?? []) as Array<{
      payment_status?: string | null;
      payment_confirmed?: boolean | null;
      payment_amount_kes?: number | null;
    }>) {
      const isPaid = String(row.payment_status ?? "").toLowerCase() === "success" || !!row.payment_confirmed;
      if (!isPaid) continue;
      const amount = Number(row.payment_amount_kes ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      totalMembershipPaidKes += amount;
      membershipPaidCount += 1;
    }

    let totalContributionKes = 0;
    let pendingContributionKes = 0;
    let successfulContributionCount = 0;
    for (const row of (walletRows ?? []) as Array<{ amount_kes?: number | null; status?: string | null }>) {
      const amount = Number(row.amount_kes ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const status = String(row.status ?? "").toLowerCase();
      if (status === "success") {
        totalContributionKes += amount;
        successfulContributionCount += 1;
      } else if (status === "pending") {
        pendingContributionKes += amount;
      }
    }

    return NextResponse.json({
      totalMembershipPaidKes,
      membershipPaidCount,
      totalContributionKes,
      pendingContributionKes,
      successfulContributionCount,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
