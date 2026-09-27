import { NextResponse } from "next/server";
import { getIdealApplicationFeeKes } from "@/lib/ideal-mr-miss-fee";

export const dynamic = "force-dynamic";

/** Public: current Kenya's Ideal Mr & Miss application fee in KES. */
export async function GET() {
  try {
    const application_fee_kes = await getIdealApplicationFeeKes();
    return NextResponse.json({ application_fee_kes });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
