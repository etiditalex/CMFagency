import { NextRequest, NextResponse } from "next/server";
import { getKcmAdminClient, getKcmMemberSession } from "@/lib/kcm-member-auth";

const BUCKET = "kcm-portfolio";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { caption?: string };
    const caption = String(body.caption ?? "").trim().slice(0, 500);

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: existing, error: findErr } = await admin
      .from("kcm_member_portfolio_items")
      .select("id,membership_id")
      .eq("id", id)
      .maybeSingle();
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
    if (!existing || String((existing as { membership_id: string }).membership_id) !== session.membershipId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { data: row, error } = await admin
      .from("kcm_member_portfolio_items")
      .update({ caption: caption || null })
      .eq("id", id)
      .select("id,file_url,mime_type,caption,sort_order,created_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, item: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getKcmMemberSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

    const admin = getKcmAdminClient();
    if (!admin) return NextResponse.json({ error: "Server configuration error." }, { status: 500 });

    const { data: existing, error: findErr } = await admin
      .from("kcm_member_portfolio_items")
      .select("id,membership_id,storage_path")
      .eq("id", id)
      .maybeSingle();
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });
    if (!existing || String((existing as { membership_id: string }).membership_id) !== session.membershipId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const storagePath = String((existing as { storage_path: string }).storage_path);
    await admin.storage.from(BUCKET).remove([storagePath]);

    const { error: delErr } = await admin.from("kcm_member_portfolio_items").delete().eq("id", id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
