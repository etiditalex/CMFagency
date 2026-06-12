import { NextRequest, NextResponse } from "next/server";

import { requireGateAccess } from "@/lib/require-gate-access";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;
  const { admin } = auth;

  const { count, error } = await admin
    .from("cmfa_registrations")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ total: count ?? 0 });
}
