import { NextRequest, NextResponse } from "next/server";
import { getExternalJobForSeo } from "@/lib/job-board-server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Public detail for an aggregated (third-party) job row.
 * Accepts DB UUID or `{source}--{external_id}` (live-cache / pre-sync links).
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const job = await getExternalJobForSeo(id);
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
