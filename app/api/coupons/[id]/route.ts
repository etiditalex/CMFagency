import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getAuth(req: Request): Promise<{ userId: string; isAdmin: boolean } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: pm } = await supabase.from("portal_members").select("role,features").eq("user_id", user.id).maybeSingle();
  const { data: au } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  const isPortal = !!pm || !!au;
  const hasCoupons = !!pm && (Array.isArray((pm as any)?.features) && (pm as any).features.includes("coupons"));
  const isAdmin = (!!pm && (pm.role === "admin" || pm.role === "manager")) || !!au;
  if (!isPortal || (!hasCoupons && !isAdmin)) return null;

  return { userId: user.id, isAdmin: !!isAdmin || !!au };
}

type PatchBody = {
  is_active?: boolean;
  code?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  campaign_id?: string | null;
  name?: string | null;
  max_uses?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: req.headers.get("authorization") ? { headers: { Authorization: req.headers.get("authorization")! } } : {},
  });

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("id,code,discount_type,discount_value,campaign_id,created_by,is_active,max_uses,used_count,valid_from,valid_until,name,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  if (!auth.isAdmin && (coupon as { created_by: string }).created_by !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ coupon });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: req.headers.get("authorization") ? { headers: { Authorization: req.headers.get("authorization")! } } : {},
  });

  const { data: existing, error: fetchErr } = await supabase
    .from("coupons")
    .select("id,created_by")
    .eq("id", id)
    .single();

  if (fetchErr || !existing) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  if (!auth.isAdmin && (existing as { created_by: string }).created_by !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (body.code !== undefined) updates.code = String(body.code).trim().toUpperCase().replace(/\s+/g, "");
  if (body.discount_type === "percent" || body.discount_type === "fixed") updates.discount_type = body.discount_type;
  if (typeof body.discount_value === "number" && body.discount_value > 0) {
    updates.discount_value = body.discount_value;
    if (body.discount_type !== "fixed" && body.discount_value > 100) {
      return NextResponse.json({ error: "Percent discount cannot exceed 100" }, { status: 400 });
    }
  }
  if (body.campaign_id !== undefined) updates.campaign_id = body.campaign_id?.trim() || null;
  if (body.name !== undefined) updates.name = body.name?.trim() || null;
  if (body.max_uses !== undefined) updates.max_uses = body.max_uses == null ? null : Math.max(0, Math.trunc(Number(body.max_uses)));
  if (body.valid_from !== undefined) updates.valid_from = body.valid_from?.trim() || null;
  if (body.valid_until !== undefined) updates.valid_until = body.valid_until?.trim() || null;

  const { data: updated, error: updateErr } = await supabase
    .from("coupons")
    .update(updates)
    .eq("id", id)
    .select("id,code,discount_type,discount_value,campaign_id,is_active,max_uses,used_count,valid_from,valid_until,name,created_at,updated_at")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  return NextResponse.json({ coupon: updated });
}
