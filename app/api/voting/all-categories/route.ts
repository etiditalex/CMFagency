import { NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Avoid oversized `.in()` lists; safe with hundreds of categories. */
const CAMPAIGN_ID_CHUNK = 40;

type CampaignRaw = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type ContestantRow = {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

/** Same window as RLS policy `campaigns_public_read_active` (evaluated in app when using service role). */
function isCampaignPublicVisible(c: CampaignRaw): boolean {
  if (!c.is_active) return false;
  const now = Date.now();
  if (c.starts_at) {
    const t = Date.parse(c.starts_at);
    if (!Number.isNaN(t) && t > now) return false;
  }
  if (c.ends_at) {
    const t = Date.parse(c.ends_at);
    if (!Number.isNaN(t) && t < now) return false;
  }
  return true;
}

function createSupabaseForVotingCatalog(): {
  client: SupabaseClient;
  bypassesRls: boolean;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (serviceKey) {
    return {
      client: createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }),
      bypassesRls: true,
    };
  }
  if (anonKey) {
    return {
      client: createClient(url, anonKey, { auth: { persistSession: false } }),
      bypassesRls: false,
    };
  }
  return null;
}

/**
 * Public catalog for `/voting/all`.
 *
 * Prefer `SUPABASE_SERVICE_ROLE_KEY` on the server: anon + RLS on `contestants` uses `EXISTS` per row and
 * often hits `statement_timeout` at ~30+ categories / many contestants. Service role reads with the same
 * visibility rules applied in this handler.
 */
export async function GET() {
  const sup = createSupabaseForVotingCatalog();
  if (!sup) {
    return NextResponse.json({ categories: [] });
  }

  const { client, bypassesRls } = sup;

  const { data: rawCampaigns, error: cErr } = await client
    .from("campaigns")
    .select("id, slug, title, description, image_url, is_active, starts_at, ends_at")
    .eq("type", "vote")
    .order("title", { ascending: true });

  if (cErr) {
    return NextResponse.json({ error: cErr.message ?? "Failed to load voting categories" }, { status: 500 });
  }

  const visible = (rawCampaigns ?? []).filter((c) => isCampaignPublicVisible(c as CampaignRaw)) as CampaignRaw[];
  if (visible.length === 0) {
    return NextResponse.json({ categories: [] });
  }

  const ids = visible.map((c) => c.id);
  const allContestants: ContestantRow[] = [];

  for (let i = 0; i < ids.length; i += CAMPAIGN_ID_CHUNK) {
    const chunk = ids.slice(i, i + CAMPAIGN_ID_CHUNK);
    const { data: rows, error: conErr } = await client
      .from("contestants")
      .select("id, campaign_id, name, description, image_url, sort_order")
      .in("campaign_id", chunk);

    if (conErr) {
      return NextResponse.json({ error: conErr.message ?? "Failed to load contestants" }, { status: 500 });
    }
    for (const r of rows ?? []) {
      allContestants.push(r as ContestantRow);
    }
  }

  // With service role, restrict contestants to allowed campaign ids only (defence in depth).
  const idSet = new Set(ids);
  const scoped = bypassesRls ? allContestants.filter((r) => idSet.has(r.campaign_id)) : allContestants;

  const byCampaign = new Map<string, ContestantRow[]>();
  for (const row of scoped) {
    const arr = byCampaign.get(row.campaign_id) ?? [];
    arr.push(row);
    byCampaign.set(row.campaign_id, arr);
  }

  const categories = visible.map((raw) => {
    const cont = [...(byCampaign.get(raw.id) ?? [])].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
    return {
      id: raw.id,
      slug: raw.slug,
      title: raw.title,
      description: raw.description,
      image_url: raw.image_url,
      contestants: cont.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        image_url: r.image_url,
        sort_order: r.sort_order,
      })),
    };
  });

  const res = NextResponse.json({ categories });
  if (!bypassesRls) {
    res.headers.set("X-Voting-Catalog-RLS", "anon");
  }
  return res;
}
