import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { fetchAllSupabasePages } from "@/lib/supabase-fetch-all-pages";

export const dynamic = "force-dynamic";

function getNairobiYmd(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) return d.toISOString().slice(0, 10);
  return `${y}-${m}-${day}`;
}

function getNairobiWeekdayIndex(d: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

function getWeekWindowNairobi(now: Date): { weekStartIso: string; weekEndIso: string; label: string } {
  // Anchor at local noon to avoid edge-case formatting shifts; Nairobi has stable +03:00 offset (no DST).
  const anchorYmd = getNairobiYmd(now);
  const anchorNoon = new Date(`${anchorYmd}T12:00:00+03:00`);
  const dayIdx = getNairobiWeekdayIndex(anchorNoon); // 0=Sun ... 6=Sat
  const diffToMonday = (dayIdx + 6) % 7; // Mon->0, Tue->1, ... Sun->6
  const mondayNoon = new Date(anchorNoon.getTime() - diffToMonday * 24 * 60 * 60 * 1000);
  const weekStartYmd = getNairobiYmd(mondayNoon);
  const weekStartIso = `${weekStartYmd}T00:00:00+03:00`;
  const endAnchor = new Date(new Date(weekStartIso).getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekEndIso = `${getNairobiYmd(endAnchor)}T00:00:00+03:00`; // exclusive end
  return {
    weekStartIso,
    weekEndIso,
    label: `${weekStartYmd} (Mon) → ${getNairobiYmd(new Date(new Date(weekStartIso).getTime() + 6 * 24 * 60 * 60 * 1000))} (Sun)`,
  };
}

async function canAccessReports(
  supabase: ReturnType<typeof createClient<any>>,
  userId: string,
  supabaseUrl: string
): Promise<boolean> {
  // Copied from sales-overview route to keep access logic consistent.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const readMembership = async () => {
    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: pmRaw } = await admin
        .from("portal_members")
        .select("role,features")
        .eq("user_id", userId)
        .maybeSingle();
      const pmRow = pmRaw as { role: string; features: unknown } | null;
      if (pmRow) {
        const role = String(pmRow.role ?? "").toLowerCase();
        if (role === "admin" || role === "manager") return true;
        const feats = pmRow.features as string[] | null | undefined;
        if (Array.isArray(feats) && feats.includes("reports")) return true;
        return false;
      }
      const { data: au } = await admin.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
      return !!au;
    }
    const { data: pmRaw } = await supabase
      .from("portal_members")
      .select("role,features")
      .eq("user_id", userId)
      .maybeSingle();
    const pm = pmRaw as { role: string; features: unknown } | null;
    if (pm) {
      const role = String(pm.role ?? "").toLowerCase();
      if (role === "admin" || role === "manager") return true;
      const feats = pm.features as string[] | null | undefined;
      if (Array.isArray(feats) && feats.includes("reports")) return true;
      return false;
    }
    const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    return !!au;
  };
  return readMembership();
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = userData.user.id;
  const accessOk = await canAccessReports(supabase, userId, supabaseUrl);
  if (!accessOk) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { weekStartIso, weekEndIso, label } = getWeekWindowNairobi(new Date());

  // Pull visible vote campaigns (RLS scopes them).
  type CampaignRow = { id: string; title?: string; type?: string };
  let campaigns: CampaignRow[];
  try {
    campaigns = await fetchAllSupabasePages(async (from, to) => {
      const r = await supabase
        .from("campaigns")
        .select("id,title,type")
        .eq("type", "vote")
        .order("created_at", { ascending: false })
        .range(from, to);
      return { data: r.data as CampaignRow[] | null, error: r.error };
    });
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "campaigns query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const campaignIds = campaigns.map((c) => c.id);
  if (campaignIds.length === 0) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      week: { start: weekStartIso, end: weekEndIso, label },
      items: [],
    });
  }

  // Aggregate from successful vote transactions this week (indexed on created_at).
  type VoteTxRow = { contestant_id: string | null; quantity: number | null; campaign_id: string };
  let voteTxRows: VoteTxRow[];
  try {
    voteTxRows = await fetchAllSupabasePages(async (from, to) => {
      const r = await supabase
        .from("transactions")
        .select("contestant_id,quantity,campaign_id")
        .eq("status", "success")
        .eq("campaign_type", "vote")
        .in("campaign_id", campaignIds)
        .gte("created_at", weekStartIso)
        .lt("created_at", weekEndIso)
        .order("id", { ascending: true })
        .range(from, to);
      return { data: r.data as VoteTxRow[] | null, error: r.error };
    });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "votes query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const totals = new Map<string, { votes: number; campaignId: string }>();
  for (const r of voteTxRows) {
    const id = String(r.contestant_id ?? "");
    const v = Math.trunc(Number(r.quantity ?? 0)) || 0;
    const cid = String(r.campaign_id ?? "");
    if (!id || v <= 0) continue;
    const cur = totals.get(id) ?? { votes: 0, campaignId: cid };
    cur.votes += v;
    if (!cur.campaignId) cur.campaignId = cid;
    totals.set(id, cur);
  }

  const ranked = [...totals.entries()]
    .map(([contestantId, v]) => ({ contestantId, votes: v.votes, campaignId: v.campaignId }))
    .sort((a, b) => b.votes - a.votes || a.contestantId.localeCompare(b.contestantId))
    .slice(0, 20);

  if (ranked.length === 0) {
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      week: { start: weekStartIso, end: weekEndIso, label },
      items: [],
    });
  }

  const contestantIds = ranked.map((r) => r.contestantId);
  const { data: contestantRows, error: conErr } = await supabase
    .from("contestants")
    .select("id,name,campaign_id,image_url")
    .in("id", contestantIds);
  if (conErr) return NextResponse.json({ error: conErr.message }, { status: 500 });

  const contestantById = new Map(
    ((contestantRows ?? []) as Array<{ id: string; name?: string | null; campaign_id?: string | null; image_url?: string | null }>).map(
      (c) => [String(c.id), c]
    )
  );

  const titleByCampaignId = new Map(campaigns.map((c) => [c.id, String(c.title ?? "Voting category")]));

  const items = ranked
    .map((r, idx) => {
      const c = contestantById.get(r.contestantId);
      const name = String(c?.name ?? "Contestant");
      const campaignId = String(c?.campaign_id ?? r.campaignId ?? "");
      const category = titleByCampaignId.get(campaignId) ?? "Voting category";
      const imageUrl = c?.image_url ? String(c.image_url) : null;
      return {
        rank: idx + 1,
        contestantId: r.contestantId,
        name,
        category,
        votes: r.votes,
        imageUrl,
      };
    })
    .filter((x) => x.votes > 0);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    week: { start: weekStartIso, end: weekEndIso, label },
    items,
  });
}

