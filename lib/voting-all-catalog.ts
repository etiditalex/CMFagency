import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { getVoteTransactionTotalsForCampaignsFlat } from "@/lib/vote-transaction-totals";

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

export type VotingAllContestantRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

export type VotingAllCategoryRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  contestants: VotingAllContestantRow[] | null;
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

export type VotingAllCatalogResult =
  | {
      ok: true;
      categories: VotingAllCategoryRow[];
      voting_starts_at: string | null;
      rlsAnon: boolean;
    }
  | { ok: false; error: string };

/**
 * Shared server logic for `/voting/all` and `GET /api/voting/all-categories`.
 * Prefer service role on the server to avoid RLS timeouts on large catalogs.
 */
export async function getVotingAllCatalog(): Promise<VotingAllCatalogResult> {
  const sup = createSupabaseForVotingCatalog();
  if (!sup) {
    return { ok: true, categories: [], voting_starts_at: null, rlsAnon: false };
  }

  const { client, bypassesRls } = sup;

  const readSchedule = () =>
    client.from("fusion_voting_schedule").select("voting_starts_at").eq("id", 1).maybeSingle();

  const [{ data: rawCampaigns, error: cErr }, schedRes] = await Promise.all([
    client
      .from("campaigns")
      .select("id, slug, title, description, image_url, is_active, starts_at, ends_at")
      .eq("type", "vote")
      .order("title", { ascending: true }),
    readSchedule(),
  ]);

  const voting_starts_at =
    !schedRes.error && schedRes.data
      ? (schedRes.data as { voting_starts_at?: string | null }).voting_starts_at ?? null
      : null;

  if (cErr) {
    return { ok: false, error: cErr.message ?? "Failed to load voting categories" };
  }

  const visible = (rawCampaigns ?? []).filter((c) => isCampaignPublicVisible(c as CampaignRaw)) as CampaignRaw[];
  if (visible.length === 0) {
    return { ok: true, categories: [], voting_starts_at, rlsAnon: !bypassesRls };
  }

  const ids = visible.map((c) => c.id);
  const allContestants: ContestantRow[] = [];

  const contestantChunksPromise = Promise.all(
    Array.from({ length: Math.ceil(ids.length / CAMPAIGN_ID_CHUNK) || 1 }, (_, k) => {
      const chunk = ids.slice(k * CAMPAIGN_ID_CHUNK, k * CAMPAIGN_ID_CHUNK + CAMPAIGN_ID_CHUNK);
      return client
        .from("contestants")
        .select("id, campaign_id, name, description, image_url, sort_order")
        .in("campaign_id", chunk);
    })
  );

  const voteTotalsPromise =
    bypassesRls && ids.length > 0
      ? getVoteTransactionTotalsForCampaignsFlat(client, ids)
      : Promise.resolve(new Map<string, number>());

  let contestantResults: Awaited<typeof contestantChunksPromise>;
  let voteTotalsByContestant: Map<string, number>;
  try {
    [contestantResults, voteTotalsByContestant] = await Promise.all([contestantChunksPromise, voteTotalsPromise]);
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "Failed to load voting catalog data";
    return { ok: false, error: msg };
  }

  for (const { data: rows, error: conErr } of contestantResults) {
    if (conErr) {
      return { ok: false, error: conErr.message ?? "Failed to load contestants" };
    }
    for (const r of rows ?? []) {
      allContestants.push(r as ContestantRow);
    }
  }

  const idSet = new Set(ids);
  const scoped = bypassesRls ? allContestants.filter((r) => idSet.has(r.campaign_id)) : allContestants;

  const byCampaign = new Map<string, ContestantRow[]>();
  for (const row of scoped) {
    const arr = byCampaign.get(row.campaign_id) ?? [];
    arr.push(row);
    byCampaign.set(row.campaign_id, arr);
  }

  const sortContestantsForCategory = (list: ContestantRow[]) =>
    [...list].sort((a, b) => {
      const va = voteTotalsByContestant.get(a.id) ?? 0;
      const vb = voteTotalsByContestant.get(b.id) ?? 0;
      if (vb !== va) return vb - va;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });

  const categories: VotingAllCategoryRow[] = visible.map((raw) => {
    const cont = sortContestantsForCategory(byCampaign.get(raw.id) ?? []);
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

  return { ok: true, categories, voting_starts_at, rlsAnon: !bypassesRls };
}
