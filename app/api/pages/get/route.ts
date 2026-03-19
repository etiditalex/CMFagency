import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ManagedPageRow = {
  id: string;
  route: string;
  section: "services" | "careers";
  title: string;
  hero_label: string;
  description: string;
  background_image_url: string | null;
  features_title: string;
  features: unknown[];
  benefits_title: string;
  benefits: unknown[];
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const route = searchParams.get("route")?.trim();
  if (!route) return NextResponse.json({ error: "route is required" }, { status: 400 });

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
  const selectWithBg =
    "id,route,section,title,hero_label,description,background_image_url,features_title,features,benefits_title,benefits,cta_title,cta_description";
  const selectWithoutBg =
    "id,route,section,title,hero_label,description,features_title,features,benefits_title,benefits,cta_title,cta_description";

  const { data, error } = await admin.from("fusion_managed_pages").select(selectWithBg).eq("route", route).maybeSingle();

  // Backward compat: table may not have background_image_url column yet.
  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    const missingCol = msg.includes("background_image_url") || msg.includes("does not exist");
    if (missingCol) {
      const { data: data2, error: err2 } = await admin
        .from("fusion_managed_pages")
        .select(selectWithoutBg)
        .eq("route", route)
        .maybeSingle();
      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 });
      return NextResponse.json({ page: (data2 as ManagedPageRow | null) ?? null });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ page: data as ManagedPageRow | null });
}

