import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listingRequiresPaidMembership } from "@/lib/job-board-access";

/**
 * Public list of published job listings (summary fields only).
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: rows, error } = await supabase
      .from("job_listings")
      .select(
        "id,title,company_name,location,employment_type,salary_text,summary,status,published_at,created_at"
      )
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      if (/relation|does not exist/i.test(error.message)) {
        return NextResponse.json({ listings: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const listings = (rows ?? []).map((r: Record<string, unknown>) => ({
      id: r.id,
      title: r.title,
      company_name: r.company_name,
      location: r.location,
      employment_type: r.employment_type,
      salary_text: r.salary_text,
      summary: r.summary,
      published_at: r.published_at,
      requires_paid_membership: listingRequiresPaidMembership(String(r.employment_type ?? "")),
    }));

    return NextResponse.json({ listings });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
