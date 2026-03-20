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

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const { id } = await ctx.params;

    const { data: row, error } = await admin.from("job_listings").select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ listing: row });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const { data: existing } = await admin.from("job_listings").select("id,status,published_at").eq("id", id).maybeSingle();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const patch: Record<string, unknown> = {};

    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.company_name === "string") patch.company_name = body.company_name.trim();
    if (typeof body.location === "string") patch.location = body.location.trim() || null;
    if (typeof body.employment_type === "string") {
      const et = body.employment_type.trim();
      if (!EMPLOYMENT_TYPES.has(et)) {
        return NextResponse.json({ error: "Invalid employment_type" }, { status: 400 });
      }
      patch.employment_type = et;
    }
    if (typeof body.salary_text === "string") patch.salary_text = body.salary_text.trim() || null;
    if (typeof body.summary === "string") patch.summary = body.summary.trim() || null;
    if (typeof body.description === "string") patch.description = body.description.trim();
    if (typeof body.contact_email === "string") patch.contact_email = body.contact_email.trim() || null;
    if (Array.isArray(body.requirements)) {
      patch.requirements = body.requirements.map((x) => String(x).trim()).filter(Boolean);
    }
    if (Array.isArray(body.benefits)) {
      patch.benefits = body.benefits.map((x) => String(x).trim()).filter(Boolean);
    }

    if (typeof body.status === "string") {
      const st = body.status.trim();
      if (!STATUSES.has(st)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      patch.status = st;
      const prev = (existing as { status?: string; published_at?: string | null }).status;
      const prevPub = (existing as { published_at?: string | null }).published_at;
      if (st === "published" && prev !== "published" && !prevPub) {
        patch.published_at = new Date().toISOString();
      }
      if (st === "draft") {
        patch.published_at = null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data: updated, error } = await admin.from("job_listings").update(patch).eq("id", id).select("*").single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ listing: updated });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const auth = await requireAdminOrManager(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;
    const { id } = await ctx.params;

    const { error } = await admin.from("job_listings").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
