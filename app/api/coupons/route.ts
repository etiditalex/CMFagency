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

type CreateBody = {
  code?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  campaign_id?: string | null;
  name?: string | null;
  max_uses?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
};

/**
 * List coupons. Clients see own; admins see all.
 */
export async function GET(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: req.headers.get("authorization") ? { headers: { Authorization: req.headers.get("authorization")! } } : {},
  });

  try {
    let query = supabase
      .from("coupons")
      .select("id,code,discount_type,discount_value,campaign_id,created_by,is_active,max_uses,used_count,valid_from,valid_until,name,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (!auth.isAdmin) {
      query = query.eq("created_by", auth.userId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    return NextResponse.json({ coupons: rows ?? [] });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load coupons" },
      { status: 500 }
    );
  }
}

/**
 * Create a new coupon.
 */
export async function POST(req: Request) {
  const auth = await getAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as CreateBody;
  const code = (body.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const discountType = body.discount_type === "fixed" ? "fixed" : "percent";
  const discountValue = Math.trunc(Number(body.discount_value ?? 0));
  const campaignId = body.campaign_id?.trim() || null;
  const name = body.name?.trim() || null;
  const maxUses = body.max_uses != null ? Math.max(0, Math.trunc(Number(body.max_uses))) : null;
  const validFrom = body.valid_from?.trim() || null;
  const validUntil = body.valid_until?.trim() || null;
  const isActive = body.is_active !== false;

  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  if (discountValue <= 0) return NextResponse.json({ error: "Discount value must be positive" }, { status: 400 });
  if (discountType === "percent" && discountValue > 100) {
    return NextResponse.json({ error: "Percent discount cannot exceed 100" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: req.headers.get("authorization") ? { headers: { Authorization: req.headers.get("authorization")! } } : {},
  });

  const { data: existing } = await supabase.from("coupons").select("id").ilike("code", code).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "A coupon with this code already exists" }, { status: 400 });
  }

  if (campaignId) {
    const { data: camp } = await supabase.from("campaigns").select("id,created_by").eq("id", campaignId).maybeSingle();
    const ownerId = (camp as { created_by?: string } | null)?.created_by;
    if (!camp || (!auth.isAdmin && ownerId !== auth.userId)) {
      return NextResponse.json({ error: "Invalid or unauthorized campaign" }, { status: 400 });
    }
  }

  const { data: inserted, error } = await supabase
    .from("coupons")
    .insert({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      campaign_id: campaignId,
      created_by: auth.userId,
      name,
      max_uses: maxUses,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      is_active: isActive,
    })
    .select("id,code,discount_type,discount_value,campaign_id,is_active,max_uses,used_count,valid_from,valid_until,name,created_at")
    .single();

  if (error) throw error;
  return NextResponse.json({ coupon: inserted });
}
