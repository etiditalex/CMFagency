import { NextResponse } from "next/server";
import { listFusionPolls } from "@/lib/fusion-polls-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = await listFusionPolls();
  if (!records) return NextResponse.json({ polls: null }, { status: 503 });
  return NextResponse.json({ polls: records.map((record) => record.poll) });
}
