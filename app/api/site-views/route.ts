import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "cmf_site_view";
/** Count at most one view per browser every 12 hours. */
const COOKIE_MAX_AGE_SEC = 60 * 60 * 12;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

/** Optional historical offset if you already know prior traffic. */
function baseOffset(): number {
  const raw = process.env.SITE_VIEWS_BASE_OFFSET;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function readTotal(): Promise<number | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from("site_page_views")
    .select("total_views")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("[site-views] read failed:", error.message);
    return null;
  }

  const total = typeof data?.total_views === "number" ? data.total_views : Number(data?.total_views ?? 0);
  if (!Number.isFinite(total)) return null;
  return total + baseOffset();
}

async function incrementTotal(): Promise<number | null> {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin.rpc("increment_site_page_views");
  if (!error && data != null) {
    const total = Number(data);
    return Number.isFinite(total) ? total + baseOffset() : null;
  }

  // Fallback if RPC is missing: read-modify-write
  const { data: row } = await supabaseAdmin
    .from("site_page_views")
    .select("total_views")
    .eq("id", 1)
    .maybeSingle();

  const current = Number(row?.total_views ?? 0);
  const next = (Number.isFinite(current) ? current : 0) + 1;

  const { error: upsertError } = await supabaseAdmin.from("site_page_views").upsert(
    { id: 1, total_views: next, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.warn("[site-views] increment failed:", error?.message ?? upsertError.message);
    return null;
  }

  return next + baseOffset();
}

/** GET — current total (no increment). */
export async function GET() {
  const total = await readTotal();
  return NextResponse.json(
    {
      total,
      configured: total != null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * POST — record one site view if this browser has not been counted recently,
 * then return the latest total.
 */
export async function POST(request: NextRequest) {
  const alreadyCounted = Boolean(request.cookies.get(COOKIE_NAME)?.value);
  let total: number | null = null;

  if (alreadyCounted) {
    total = await readTotal();
  } else {
    total = await incrementTotal();
  }

  const res = NextResponse.json({
    total,
    configured: total != null,
    counted: !alreadyCounted && total != null,
  });

  if (!alreadyCounted && total != null) {
    res.cookies.set(COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
    });
  }

  res.headers.set("Cache-Control", "no-store");
  return res;
}
