import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";

const EMPLOYMENT_TYPES = new Set([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "attachment",
]);
const STATUSES = new Set(["draft", "published", "closed"]);

function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * GET: all listings (any status). POST: create listing.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { data: rows, error } = await admin
      .from("job_listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      if (/relation|does not exist/i.test(error.message)) {
        return NextResponse.json({ listings: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listings: rows ?? [] });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const title = String(body.title ?? "").trim();
    const company_name = String(body.company_name ?? "").trim();
    const employment_type = String(body.employment_type ?? "").trim();
    const description = String(body.description ?? "").trim();
    const status = String(body.status ?? "draft").trim();

    if (!title || !company_name) {
      return NextResponse.json({ error: "title and company_name are required" }, { status: 400 });
    }
    if (!EMPLOYMENT_TYPES.has(employment_type)) {
      return NextResponse.json(
        { error: `employment_type must be one of: ${[...EMPLOYMENT_TYPES].join(", ")}` },
        { status: 400 }
      );
    }
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let requirements: string[] = [];
    let benefits: string[] = [];
    if (Array.isArray(body.requirements)) {
      requirements = body.requirements.map((x) => String(x).trim()).filter(Boolean);
    } else if (typeof body.requirements_text === "string") {
      requirements = parseLines(body.requirements_text);
    }
    if (Array.isArray(body.benefits)) {
      benefits = body.benefits.map((x) => String(x).trim()).filter(Boolean);
    } else if (typeof body.benefits_text === "string") {
      benefits = parseLines(body.benefits_text);
    }

    const nowIso = new Date().toISOString();
    const row = {
      title,
      company_name,
      location: String(body.location ?? "").trim() || null,
      employment_type,
      salary_text: String(body.salary_text ?? "").trim() || null,
      summary: String(body.summary ?? "").trim() || null,
      description: description || "—",
      requirements,
      benefits,
      contact_email: String(body.contact_email ?? "").trim() || null,
      status,
      posted_by: userId,
      published_at: status === "published" ? nowIso : null,
    };

    const { data: inserted, error } = await admin.from("job_listings").insert(row).select("*").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ listing: inserted });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
