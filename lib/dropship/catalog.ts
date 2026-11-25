import type { SupabaseClient } from "@supabase/supabase-js";

export type MerchSource = "catalog" | "aliexpress";

export type MerchItem = {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  gallery: string[];
  category: string;
  rating: number;
  reviews: number;
  orders: number;
  description: string;
  inStock: boolean;
  sizes: string[];
  colors: string[];
  source: MerchSource;
  sourceUrl: string | null;
};

export const SUPPLIER_DEPARTMENTS = [
  { id: "Fashion", query: "women fashion clothes" },
  { id: "Beauty", query: "beauty skincare" },
  { id: "Home", query: "home decor" },
  { id: "Electronics", query: "electronics gadgets" },
  { id: "Accessories", query: "fashion accessories" },
  { id: "Sports", query: "sports fitness" },
] as const;

const BASE_COLUMNS =
  "id,name,price_kes,original_price_kes,short_description,image_url,category,in_stock,available_sizes,available_colors";

export const MERCH_COLUMNS = `${BASE_COLUMNS},source,source_product_id,source_url,rating,review_count,orders_count,gallery_urls`;

export function formatKes(amount: number): string {
  return `KSh ${Math.round(amount).toLocaleString("en-KE")}`;
}

export function discountPercent(price: number, originalPrice: number | null): number | null {
  if (originalPrice == null || originalPrice <= price) return null;
  const pct = Math.round(((originalPrice - price) / originalPrice) * 100);
  return pct >= 1 ? pct : null;
}

export function isMissingDropshipColumn(error: { message?: string } | null | undefined): boolean {
  const msg = String(error?.message ?? "").toLowerCase();
  const names = ["source", "source_product_id", "source_url", "gallery_urls", "orders_count", "review_count", "rating"];
  const mentionsDropship = names.some((name) => msg.includes(name));
  if (!mentionsDropship && !msg.includes("schema cache")) return false;
  return msg.includes("does not exist") || msg.includes("schema cache") || msg.includes("could not find");
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function mapMerchRow(row: Record<string, unknown>): MerchItem {
  const sourceRaw = String(row.source ?? "catalog");
  const ratingRaw = Number(row.rating ?? 0);
  const gallery = asStringList(row.gallery_urls).filter((url) => url.startsWith("https://"));
  const image = String(row.image_url ?? "");
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    price: Number(row.price_kes ?? 0),
    originalPrice: row.original_price_kes == null ? null : Number(row.original_price_kes),
    image,
    gallery: gallery.filter((url) => url !== image).slice(0, 6),
    category: String(row.category ?? ""),
    rating: Number.isFinite(ratingRaw) ? ratingRaw : 0,
    reviews: Math.max(0, Math.trunc(Number(row.review_count ?? 0)) || 0),
    orders: Math.max(0, Math.trunc(Number(row.orders_count ?? 0)) || 0),
    description: String(row.short_description ?? ""),
    inStock: Boolean(row.in_stock),
    sizes: asStringList(row.available_sizes),
    colors: asStringList(row.available_colors),
    source: sourceRaw === "aliexpress" ? "aliexpress" : "catalog",
    sourceUrl: row.source_url ? String(row.source_url) : null,
  };
}

async function selectMerchandise(
  supabase: SupabaseClient,
  apply: (columns: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>
): Promise<MerchItem[]> {
  const extended = await apply(MERCH_COLUMNS);
  if (!extended.error) {
    return ((extended.data ?? []) as Record<string, unknown>[]).map(mapMerchRow);
  }
  if (!isMissingDropshipColumn(extended.error)) {
    throw new Error(extended.error.message || "Could not load products");
  }
  const basic = await apply(BASE_COLUMNS);
  if (basic.error) throw new Error(basic.error.message || "Could not load products");
  return ((basic.data ?? []) as Record<string, unknown>[]).map(mapMerchRow);
}

export async function loadActiveMerchandise(supabase: SupabaseClient, limit = 200): Promise<MerchItem[]> {
  return selectMerchandise(supabase, (columns) =>
    supabase
      .from("merchandise_items")
      .select(columns)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit)
  );
}

export async function loadProductById(supabase: SupabaseClient, id: number): Promise<MerchItem | null> {
  const rows = await selectMerchandise(supabase, (columns) =>
    supabase.from("merchandise_items").select(columns).eq("is_active", true).eq("id", id).limit(1)
  );
  return rows[0] ?? null;
}
