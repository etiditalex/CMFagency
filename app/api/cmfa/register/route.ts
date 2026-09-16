import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "CMFA registration is closed." },
    { status: 410 }
  );
}
