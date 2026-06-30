import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { requireGateAccess } from "@/lib/require-gate-access";

export const runtime = "nodejs";

const REF_PATTERN = /^[A-Za-z0-9._-]{5,160}$/;

async function loadTicketPurchaseForUser(reference: string, token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: NextResponse.json({ error: "Server configuration missing" }, { status: 500 }) };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: row, error } = await supabase
    .from("transactions")
    .select("id, reference, status, campaign_type, revoked_at, payer_name, email")
    .eq("reference", reference)
    .maybeSingle();

  if (error) return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  if (!row) return { error: NextResponse.json({ error: "Ticket purchase not found." }, { status: 404 }) };

  const tx = row as {
    id: string;
    reference: string;
    status?: string;
    campaign_type?: string | null;
    revoked_at?: string | null;
    payer_name?: string | null;
    email?: string | null;
  };

  if (tx.campaign_type === "vote") {
    return { error: NextResponse.json({ error: "Vote transactions cannot be changed here." }, { status: 400 }) };
  }
  if (tx.status !== "success") {
    return { error: NextResponse.json({ error: "Only successful purchases can be managed." }, { status: 400 }) };
  }

  return { tx };
}

function bearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference: rawRef } = await ctx.params;
  const reference = decodeURIComponent(rawRef ?? "").trim();
  if (!reference || !REF_PATTERN.test(reference)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  const loaded = await loadTicketPurchaseForUser(reference, token);
  if ("error" in loaded) return loaded.error;
  const { tx } = loaded;

  if (tx.revoked_at) {
    return NextResponse.json({ error: "Ticket is already revoked." }, { status: 400 });
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await auth.admin
    .from("transactions")
    .update({ revoked_at: revokedAt })
    .eq("id", tx.id)
    .select("reference, revoked_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Ticket purchase not found." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    reference: (data as { reference?: string }).reference ?? reference,
    revoked_at: (data as { revoked_at?: string }).revoked_at ?? revokedAt,
    payer_name: tx.payer_name,
    email: tx.email,
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const auth = await requireGateAccess(req);
  if ("error" in auth) return auth.error;

  const token = bearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reference: rawRef } = await ctx.params;
  const reference = decodeURIComponent(rawRef ?? "").trim();
  if (!reference || !REF_PATTERN.test(reference)) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  const loaded = await loadTicketPurchaseForUser(reference, token);
  if ("error" in loaded) return loaded.error;
  const { tx } = loaded;

  const { error } = await auth.admin.from("transactions").delete().eq("id", tx.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    deleted_reference: reference,
    payer_name: tx.payer_name,
    email: tx.email,
  });
}
