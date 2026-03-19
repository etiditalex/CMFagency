import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type UpsertPayload = {
  route: string;
  section: "services" | "careers";
  title: string;
  hero_label: string;
  description: string;
  features_title: string;
  features: string[];
  benefits_title: string;
  benefits: string[];
  cta_title: string;
  cta_description: string;
};

async function getCallerAdminRole(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { role: null as string | null };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return { role: null as string | null };

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return { role: null as string | null };

  const userId = String(userData.user.id ?? "");
  if (!userId) return { role: null as string | null };

  try {
    const { data: memberRow, error: memberErr } = await admin
      .from("portal_members")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      const msg = String(memberErr.message ?? "").toLowerCase();
      const code = String((memberErr as any).code ?? "");
      const missingPortal = code === "42P01" || (msg.includes("portal_members") && msg.includes("does not exist"));
      if (missingPortal) {
        const { data: legacyAdminRow } = await admin
          .from("admin_users")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();
        return { role: legacyAdminRow ? "admin" : null };
      }
      return { role: null };
    }

    return { role: String(memberRow?.role ?? "") || null };
  } catch {
    return { role: null };
  }
}

export async function POST(req: NextRequest) {
  let body: UpsertPayload;
  try {
    body = (await req.json()) as UpsertPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.route || !body?.section) {
    return NextResponse.json({ error: "route and section are required" }, { status: 400 });
  }

  const { role } = await getCallerAdminRole(req);
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const normalized: UpsertPayload = {
    route: body.route.trim(),
    section: body.section,
    title: String(body.title ?? ""),
    hero_label: String(body.hero_label ?? ""),
    description: String(body.description ?? ""),
    features_title: String(body.features_title ?? ""),
    features: Array.isArray(body.features) ? body.features.map((x) => String(x)) : [],
    benefits_title: String(body.benefits_title ?? ""),
    benefits: Array.isArray(body.benefits) ? body.benefits.map((x) => String(x)) : [],
    cta_title: String(body.cta_title ?? ""),
    cta_description: String(body.cta_description ?? ""),
  };

  // Postgres UPSERT by unique `route`.
  const { error } = await admin
    .from("fusion_managed_pages")
    .upsert(
      {
        route: normalized.route,
        section: normalized.section,
        title: normalized.title,
        hero_label: normalized.hero_label,
        description: normalized.description,
        features_title: normalized.features_title,
        features: normalized.features,
        benefits_title: normalized.benefits_title,
        benefits: normalized.benefits,
        cta_title: normalized.cta_title,
        cta_description: normalized.cta_description,
      },
      { onConflict: "route" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

