import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrManager } from "@/lib/fusion-require-admin";
import { checkDropshipImportRateLimit, checkDropshipSearchRateLimit, getClientIp } from "@/lib/rate-limit";
import { aliexpressConfigured, pullAliExpressIntoCatalog } from "@/lib/dropship/aliexpress";
import type { MerchItem } from "@/lib/dropship/catalog";

export const dynamic = "force-dynamic";

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function forShop(item: MerchItem): MerchItem {
  return { ...item, sourceUrl: null };
}

export async function GET(req: NextRequest) {
  const configured = aliexpressConfigured();
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  if (!query) {
    return NextResponse.json({ configured, products: [], pulled: 0 });
  }

  const limit = checkDropshipSearchRateLimit(getClientIp(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { configured, products: [], pulled: 0, warning: "Too many supplier searches. Try again in a few minutes." },
      { status: 429, headers: limit.retryAfter ? { "Retry-After": String(limit.retryAfter) } : undefined }
    );
  }

  if (!configured) {
    return NextResponse.json({ configured: false, products: [], pulled: 0 });
  }

  const admin = adminClient();
  if (!admin) {
    return NextResponse.json(
      { configured: true, products: [], pulled: 0, warning: "Shop storage is not configured on the server." },
      { status: 500 }
    );
  }

  const result = await pullAliExpressIntoCatalog(admin, { query, category, pageSize: 20 });
  return NextResponse.json({
    configured: result.configured,
    products: result.products.map(forShop),
    pulled: result.products.length,
    warning: result.warning ?? null,
    status: result.status ?? null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrManager(req);
  if ("error" in auth) return auth.error;

  const limit = checkDropshipImportRateLimit(auth.userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many imports. Wait a few minutes and try again." },
      { status: 429, headers: limit.retryAfter ? { "Retry-After": String(limit.retryAfter) } : undefined }
    );
  }

  let body: { query?: string; category?: string; pageSize?: number } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = String(body.query ?? "").trim();
  if (query.length < 2) {
    return NextResponse.json({ error: "Enter a keyword or an AliExpress product link." }, { status: 400 });
  }

  if (!aliexpressConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        products: [],
        pulled: 0,
        error: "Set ALIEXPRESS_APP_KEY, ALIEXPRESS_APP_SECRET, and ALIEXPRESS_TRACKING_ID, then try again.",
      },
      { status: 400 }
    );
  }

  const result = await pullAliExpressIntoCatalog(auth.admin, {
    query,
    category: body.category,
    pageSize: body.pageSize ?? 30,
  });

  return NextResponse.json({
    configured: result.configured,
    products: result.products,
    pulled: result.products.length,
    warning: result.warning ?? null,
    status: result.status ?? null,
  });
}
