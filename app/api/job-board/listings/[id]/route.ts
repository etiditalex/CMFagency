import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { listingRequiresPaidMembership } from "@/lib/job-board-access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Single published listing. Full detail for internship/attachment or when caller has active membership.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row, error } = await supabase
      .from("job_listings")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const r = row as Record<string, unknown>;
    const employmentType = String(r.employment_type ?? "");
    const needsMembership = listingRequiresPaidMembership(employmentType);

    let hasMembership = false;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (token && needsMembership) {
      const authClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: userData } = await authClient.auth.getUser(token);
      const uid = userData?.user?.id;
      if (uid) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: mem } = await admin
          .from("job_board_memberships")
          .select("valid_until")
          .eq("user_id", uid)
          .maybeSingle();
        const vu = mem && (mem as { valid_until?: string }).valid_until;
        if (vu) {
          const until = new Date(vu);
          hasMembership = !Number.isNaN(until.getTime()) && until > new Date();
        }
      }
    }

    const unlocked = !needsMembership || hasMembership;

    const poster =
      typeof r.poster_url === "string" && r.poster_url.trim() ? String(r.poster_url).trim() : null;

    if (unlocked) {
      return NextResponse.json({
        listing: {
          id: r.id,
          title: r.title,
          company_name: r.company_name,
          location: r.location,
          employment_type: r.employment_type,
          salary_text: r.salary_text,
          summary: r.summary,
          poster_url: poster,
          description: r.description,
          requirements: r.requirements,
          benefits: r.benefits,
          contact_email: r.contact_email,
          published_at: r.published_at,
        },
        locked: false,
        requires_paid_membership: needsMembership,
      });
    }

    return NextResponse.json({
      listing: {
        id: r.id,
        title: r.title,
        company_name: r.company_name,
        location: r.location,
        employment_type: r.employment_type,
        salary_text: r.salary_text,
        summary: r.summary,
        poster_url: poster,
        published_at: r.published_at,
      },
      locked: true,
      requires_paid_membership: true,
      message:
        "This vacancy is for members with an active job-board subscription (KES 500/year). Internship and industrial attachment roles are free to view.",
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
