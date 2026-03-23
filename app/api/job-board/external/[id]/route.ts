import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Public detail for an aggregated (third-party) job row.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row, error } = await supabase
      .from("aggregated_jobs")
      .select(
        "id,source,title,company_name,location,employment_type,salary_text,summary,description,apply_url,company_logo_url,industry,seniority,posted_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (/relation|does not exist/i.test(error.message)) {
        return NextResponse.json({ error: "Job board data not configured" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const r = row as Record<string, unknown>;
    return NextResponse.json({
      job: {
        id: String(r.id),
        source: String(r.source),
        title: r.title,
        company_name: r.company_name,
        location: r.location,
        employment_type: r.employment_type,
        salary_text: r.salary_text,
        summary: r.summary,
        description: r.description,
        apply_url: r.apply_url,
        poster_url:
          typeof r.company_logo_url === "string" && r.company_logo_url.trim()
            ? String(r.company_logo_url).trim()
            : null,
        industry: r.industry ?? null,
        seniority: r.seniority ?? null,
        posted_at: r.posted_at ?? null,
      },
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
