import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FusionManagedPage = {
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const route = searchParams.get("route")?.trim();
  if (!route) return NextResponse.json({ error: "route is required" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Server configuration missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

  const selectWithBg =
    "route,section,title,hero_label,description,background_image_url,features_title,features,benefits_title,benefits,cta_title,cta_description";
  const selectWithoutBg =
    "route,section,title,hero_label,description,features_title,features,benefits_title,benefits,cta_title,cta_description";

  const { data, error } = await supabase.from("fusion_managed_pages").select(selectWithBg).eq("route", route).maybeSingle();

  // Backward compat if background column doesn't exist yet.
  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    const missingCol = msg.includes("background_image_url") || msg.includes("does not exist");
    const missingTable =
      msg.includes("does not exist") || msg.includes("fusion_managed_pages") || String((error as any).code ?? "") === "42P01";
    if (missingTable) return NextResponse.json({ page: null });
    if (missingCol) {
      const { data: data2 } = await supabase
        .from("fusion_managed_pages")
        .select(selectWithoutBg)
        .eq("route", route)
        .maybeSingle();
      return NextResponse.json({ page: (data2 as FusionManagedPage | null) ?? null });
    }
  }

  return NextResponse.json({ page: (data as FusionManagedPage | null) ?? null });
}

