import { createClient } from "@supabase/supabase-js";
import { listingRequiresPaidMembership } from "@/lib/job-board-access";

export type JobListingSummary = {
  id: string;
  title: string;
  company_name: string;
  location: string | null;
  employment_type: string;
  salary_text: string | null;
  summary: string | null;
  poster_url: string | null;
  industry: string | null;
  seniority: string | null;
  published_at: string | null;
  requires_paid_membership: boolean;
};

/**
 * Published job listings for the public job board (same shape as GET /api/job-board/listings).
 * Use from Server Components so the first paint includes listings instead of a client fetch waterfall.
 */
export async function getPublishedJobListings(): Promise<{
  listings: JobListingSummary[];
  error: string | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { listings: [], error: "Server configuration error" };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await supabase
    .from("job_listings")
    .select(
      "id,title,company_name,location,employment_type,salary_text,summary,poster_url,industry,seniority,status,published_at,created_at"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    if (/relation|does not exist/i.test(error.message)) {
      return { listings: [], error: null };
    }
    return { listings: [], error: error.message };
  }

  const listings: JobListingSummary[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    company_name: String(r.company_name ?? ""),
    location: r.location != null ? String(r.location) : null,
    employment_type: String(r.employment_type ?? ""),
    salary_text: r.salary_text != null ? String(r.salary_text) : null,
    summary: r.summary != null ? String(r.summary) : null,
    poster_url: typeof r.poster_url === "string" && r.poster_url.trim() ? r.poster_url.trim() : null,
    industry: typeof r.industry === "string" && r.industry.trim() ? r.industry.trim() : null,
    seniority: typeof r.seniority === "string" && r.seniority.trim() ? r.seniority.trim() : null,
    published_at: r.published_at != null ? String(r.published_at) : null,
    requires_paid_membership: listingRequiresPaidMembership(String(r.employment_type ?? "")),
  }));

  return { listings, error: null };
}
