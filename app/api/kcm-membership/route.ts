import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fashionCategoryToProfileCategory } from "@/lib/kcm-profile-category";

type Body = {
  membership_id?: string;
  top_model_interest?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const membershipId = String(body.membership_id ?? "").trim();
    const topModelInterest = Boolean(body.top_model_interest);

    if (!membershipId) {
      return NextResponse.json({ error: "Missing membership_id." }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: row, error: lookupErr } = await admin
      .from("kcm_memberships")
      .select("id,payment_status")
      .eq("id", membershipId)
      .maybeSingle();

    if (lookupErr) return NextResponse.json({ error: lookupErr.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Membership record not found." }, { status: 404 });
    if (String((row as { payment_status?: string }).payment_status ?? "") !== "success") {
      return NextResponse.json({ error: "Payment is not completed yet." }, { status: 400 });
    }

    const { error } = await admin
      .from("kcm_memberships")
      .update({
        top_model_interest: topModelInterest,
        status: "new",
        updated_at: new Date().toISOString(),
      })
      .eq("id", membershipId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: mem, error: memErr } = await admin
      .from("kcm_memberships")
      .select("email,fashion_category,fashion_category_other,first_name,second_name")
      .eq("id", membershipId)
      .maybeSingle();

    if (!memErr && mem) {
      const { data: existingProf } = await admin
        .from("kcm_member_profiles")
        .select(
          "display_name,bio,portfolio_text,avatar_url,cover_url,professional_title,social_instagram,social_facebook,social_tiktok,social_x"
        )
        .eq("membership_id", membershipId)
        .maybeSingle();

      const mapped = fashionCategoryToProfileCategory(
        (mem as { fashion_category?: string | null }).fashion_category
      );

      let professionalTitle =
        (existingProf as { professional_title?: string | null } | null)?.professional_title ?? null;
      const fc = String((mem as { fashion_category?: string | null }).fashion_category ?? "")
        .trim()
        .toLowerCase();
      if (fc === "other") {
        const t = String((mem as { fashion_category_other?: string | null }).fashion_category_other ?? "").trim();
        if (t) professionalTitle = t.slice(0, 180);
      }

      const fn = String((mem as { first_name?: string | null }).first_name ?? "").trim();
      const sn = String((mem as { second_name?: string | null }).second_name ?? "").trim();
      const nameFromMembership = `${fn} ${sn}`.trim();
      const displayName =
        (existingProf as { display_name?: string | null } | null)?.display_name?.trim() ||
        (nameFromMembership || null);

      const { error: profErr } = await admin.from("kcm_member_profiles").upsert(
        {
          membership_id: membershipId,
          email: String((mem as { email: string }).email),
          profile_category: mapped,
          professional_title: professionalTitle,
          display_name: displayName,
          bio: (existingProf as { bio?: string | null } | null)?.bio ?? null,
          portfolio_text: (existingProf as { portfolio_text?: string | null } | null)?.portfolio_text ?? null,
          avatar_url: (existingProf as { avatar_url?: string | null } | null)?.avatar_url ?? null,
          cover_url: (existingProf as { cover_url?: string | null } | null)?.cover_url ?? null,
          social_instagram: (existingProf as { social_instagram?: string | null } | null)?.social_instagram ?? null,
          social_facebook: (existingProf as { social_facebook?: string | null } | null)?.social_facebook ?? null,
          social_tiktok: (existingProf as { social_tiktok?: string | null } | null)?.social_tiktok ?? null,
          social_x: (existingProf as { social_x?: string | null } | null)?.social_x ?? null,
        },
        { onConflict: "membership_id" }
      );
      if (profErr) {
        return NextResponse.json({ error: profErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
