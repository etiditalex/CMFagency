import { NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

type WalletRow = {
  id: string;
  amount_kes: number;
  status: "pending" | "success" | "failed";
  phone: string;
  mpesa_receipt: string | null;
  failure_reason: string | null;
  initiated_at: string;
  paid_at: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: rows, error } = await admin
      .from("kcm_member_wallet_transactions")
      .select("id,amount_kes,status,phone,mpesa_receipt,failure_reason,initiated_at,paid_at,created_at")
      .eq("membership_id", session.membershipId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const txs = (rows ?? []) as WalletRow[];
    const balanceKes = txs
      .filter((tx) => tx.status === "success")
      .reduce((sum, tx) => sum + Number(tx.amount_kes || 0), 0);
    const pendingKes = txs
      .filter((tx) => tx.status === "pending")
      .reduce((sum, tx) => sum + Number(tx.amount_kes || 0), 0);

    return NextResponse.json({
      balance_kes: balanceKes,
      pending_kes: pendingKes,
      transactions: txs,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unexpected error" }, { status: 500 });
  }
}
