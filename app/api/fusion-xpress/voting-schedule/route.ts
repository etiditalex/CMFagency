import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { readVotingSettings, VOTING_SHOW_TOTALS_PATCH_FILE } from "@/lib/voting-visibility";

async function getCallerAdminRole(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { role: null as string | null };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { role: null as string | null };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { role: null as string | null };

  const userId = String(userData.user.id ?? "");
  if (!userId) return { role: null as string | null };

  try {
    const { data: memberRow, error: memberErr } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      const msg = String(memberErr.message ?? "").toLowerCase();
      const code = String((memberErr as { code?: string }).code ?? "");
      const missingPortal = code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
      if (missingPortal) {
        const { data: legacyAdminRow } = await admin
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        return { role: legacyAdminRow ? "admin" : null };
      }
      return { role: null };
    }

    return { role: String(memberRow?.role ?? "") || null };
  } catch {
    return { role: null };
  }
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Current global voting settings (Fusion Xpress admin or manager).
 */
export async function GET(req: NextRequest) {
  const { role } = await getCallerAdminRole(req);
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });

  const settings = await readVotingSettings(admin);
  return NextResponse.json(settings, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

/**
 * Update global voting settings (Fusion Xpress admin or manager).
 * Body accepts any of: `{ "date": "YYYY-MM-DD" }` (midnight East Africa Time),
 * `{ "voting_starts_at": "<ISO>" }`, `{ "show_vote_totals": boolean }`.
 */
export async function PATCH(req: NextRequest) {
  const { role } = await getCallerAdminRole(req);
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { voting_starts_at?: string; date?: string; show_vote_totals?: unknown };
  try {
    body = (await req.json()) as { voting_starts_at?: string; date?: string; show_vote_totals?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let votingStartsAt: string | null = null;
  if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())) {
    votingStartsAt = `${body.date.trim()}T00:00:00+03:00`;
  } else if (body.voting_starts_at?.trim()) {
    const t = Date.parse(body.voting_starts_at.trim());
    if (!Number.isNaN(t)) votingStartsAt = new Date(t).toISOString();
  }

  const showVoteTotals = typeof body.show_vote_totals === "boolean" ? body.show_vote_totals : null;

  if (!votingStartsAt && showVoteTotals === null) {
    return NextResponse.json(
      { error: 'Provide "date" (YYYY-MM-DD), "voting_starts_at" (ISO 8601) or "show_vote_totals" (boolean)' },
      { status: 400 }
    );
  }

  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });

  /** Upsert overwrites the whole row, so carry over whichever field this request did not set. */
  const current = await readVotingSettings(admin);
  const nextVotingStartsAt = votingStartsAt ?? current.voting_starts_at;

  const patch: Record<string, unknown> = {
    id: 1,
    updated_at: new Date().toISOString(),
  };
  /** Omitted rather than sent as null: the column is NOT NULL with a default. */
  if (nextVotingStartsAt) patch.voting_starts_at = nextVotingStartsAt;
  if (showVoteTotals !== null) patch.show_vote_totals = showVoteTotals;

  const { error } = await admin.from("fusion_voting_schedule").upsert(patch, { onConflict: "id" });

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("show_vote_totals")) {
      return NextResponse.json(
        {
          error: `Column show_vote_totals missing. Run ${VOTING_SHOW_TOTALS_PATCH_FILE} in Supabase.`,
        },
        { status: 500 }
      );
    }
    const missing = msg.includes("does not exist") || msg.includes("fusion_voting_schedule");
    if (missing) {
      return NextResponse.json(
        {
          error:
            "Table fusion_voting_schedule missing. Run database/ticketing_voting_mvp_patch_62_fusion_voting_schedule.sql in Supabase.",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    voting_starts_at: nextVotingStartsAt,
    show_vote_totals: showVoteTotals ?? current.show_vote_totals,
  });
}
