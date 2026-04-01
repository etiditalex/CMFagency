import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Avoid huge `.in()` URLs; each chunk is a simple indexed contestants query. */
const CAMPAIGN_ID_CHUNK = 80;

type ContestantRow = {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

/**
 * Public: all visible vote campaigns + contestants for `/voting/all`.
 * Uses two flat queries instead of PostgREST nested `resource(...)` embeds — those often hit
 * `statement_timeout` when RLS runs per-row EXISTS subqueries on large joins.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ categories: [] });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: campaigns, error: cErr } = await supabase
    .from("campaigns")
    .select("id, slug, title, description, image_url")
    .eq("type", "vote")
    .order("title", { ascending: true });

  if (cErr) {
    return NextResponse.json({ error: cErr.message ?? "Failed to load voting categories" }, { status: 500 });
  }

  const list = campaigns ?? [];
  if (list.length === 0) {
    return NextResponse.json({ categories: [] });
  }

  const ids = list.map((c) => String((c as { id: string }).id));
  const allContestants: ContestantRow[] = [];

  for (let i = 0; i < ids.length; i += CAMPAIGN_ID_CHUNK) {
    const chunk = ids.slice(i, i + CAMPAIGN_ID_CHUNK);
    const { data: rows, error: conErr } = await supabase
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

  const byCampaign = new Map<string, ContestantRow[]>();
  for (const row of allContestants) {
    const arr = byCampaign.get(row.campaign_id) ?? [];
    arr.push(row);
    byCampaign.set(row.campaign_id, arr);
  }

  const categories = list.map((c) => {
    const raw = c as {
      id: string;
      slug: string;
      title: string;
      description: string | null;
      image_url: string | null;
    };
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

  return NextResponse.json({ categories });
}
