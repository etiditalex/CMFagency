import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MERCH_COLUMNS, mapMerchRow, type MerchItem } from "@/lib/dropship/catalog";

type RawProduct = Record<string, unknown>;

export type SupplierPullResult = {
  configured: boolean;
  products: MerchItem[];
  warning?: string;
};

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name] ?? "");
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function aliexpressConfigured(): boolean {
  return Boolean(
    process.env.ALIEXPRESS_APP_KEY?.trim() &&
      process.env.ALIEXPRESS_APP_SECRET?.trim() &&
      process.env.ALIEXPRESS_TRACKING_ID?.trim()
  );
}

function signRequest(apiName: string, params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params).sort();
  let payload = apiName;
  for (const key of keys) {
    const value = params[key];
    if (!key || value == null || value === "") continue;
    payload += key + value;
  }
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex").toUpperCase();
}

function httpsUrl(raw: unknown): string | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const withProtocol = text.startsWith("//") ? `https:${text}` : text.replace(/^http:\/\//i, "https://");
  if (!withProtocol.startsWith("https://")) return null;
  try {
    const url = new URL(withProtocol);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function asProductList(node: unknown, depth = 0): RawProduct[] {
  if (node == null || depth > 7) return [];
  if (Array.isArray(node)) {
    const objects = node.filter((item) => item && typeof item === "object") as RawProduct[];
    if (objects.some((item) => "product_id" in item || "product_title" in item)) return objects;
    for (const item of objects) {
      const found = asProductList(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }
  if (typeof node !== "object") return [];
  const record = node as Record<string, unknown>;
  for (const key of ["product", "products", "resp_result", "result", "result_list"]) {
    if (key in record) {
      const found = asProductList(record[key], depth + 1);
      if (found.length) return found;
    }
  }
  return [];
}

function apiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const error = record.error_response;
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const msg = String(err.msg || err.sub_msg || err.message || "").trim();
    return msg || "AliExpress rejected the request.";
  }
  return null;
}

function feedbackToStars(raw: unknown): number {
  const n = parseFloat(String(raw ?? "").replace("%", "").replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  const percent = n <= 5 ? n * 20 : n;
  const stars = (Math.min(100, percent) / 100) * 5;
  return Math.round(stars * 10) / 10;
}

function moneyToKes(amountRaw: unknown, currencyRaw: unknown): number | null {
  const amount = parseFloat(String(amountRaw ?? "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return null;
  const currency = String(currencyRaw ?? "USD").trim().toUpperCase();
  const usdToKes = envNumber("DROPSHIP_USD_TO_KES", 130, 50, 400);
  const markup = envNumber("DROPSHIP_MARKUP_PERCENT", 40, 0, 300);
  const kes = currency === "KES" ? amount : amount * usdToKes;
  const withMarkup = kes * (1 + markup / 100);
  return Math.max(50, Math.round(withMarkup / 10) * 10);
}

function ordersCount(raw: unknown): number {
  const n = Math.trunc(Number(String(raw ?? "").replace(/[,+]/g, "")));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function productIdsFromQuery(query: string): string[] {
  const ids = new Set<string>();
  const item = query.match(/item\/(\d{6,})/i);
  if (item?.[1]) ids.add(item[1]);
  const param = query.match(/(?:productIds|product_ids)=(\d{6,})/i);
  if (param?.[1]) ids.add(param[1]);
  if (/^\d{8,}$/.test(query)) ids.add(query);
  return Array.from(ids).slice(0, 10);
}

async function callAliExpress(method: string, business: Record<string, string>): Promise<unknown> {
  const appKey = process.env.ALIEXPRESS_APP_KEY?.trim() ?? "";
  const secret = process.env.ALIEXPRESS_APP_SECRET?.trim() ?? "";
  const endpoint = (process.env.ALIEXPRESS_API_URL || "https://api-sg.aliexpress.com/sync").trim();
  const params: Record<string, string> = {
    method,
    app_key: appKey,
    timestamp: String(Date.now()),
    sign_method: "sha256",
    ...business,
  };
  params.sign = signRequest(method, params, secret);
  const body = new URLSearchParams(params);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("AliExpress returned a response that was not JSON.");
  }
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload) || `AliExpress request failed (${response.status}).`);
  }
  const error = apiErrorMessage(payload);
  if (error) throw new Error(error);
  return payload;
}

function toDrafts(products: RawProduct[], categoryLabel: string) {
  const drafts = [];
  for (const product of products) {
    const sourceId = String(product.product_id ?? "").replace(/\D/g, "");
    const image = httpsUrl(product.product_main_image_url);
    const title = String(product.product_title ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
    if (!sourceId || !image || !title) continue;
    const currency =
      product.target_sale_price_currency || product.sale_price_currency || product.target_original_price_currency;
    const sale = moneyToKes(
      product.target_sale_price ?? product.app_sale_price ?? product.sale_price,
      currency
    );
    if (sale == null) continue;
    const original = moneyToKes(
      product.target_original_price ?? product.original_price ?? product.app_original_price,
      product.target_original_price_currency || currency
    );
    const small = product.product_small_image_urls;
    const smallList = Array.isArray(small)
      ? small
      : small && typeof small === "object" && Array.isArray((small as { string?: unknown }).string)
        ? (small as { string: unknown[] }).string
        : [];
    const gallery = smallList.map(httpsUrl).filter((url): url is string => Boolean(url && url !== image)).slice(0, 6);
    const category =
      categoryLabel ||
      String(product.first_level_category_name || product.second_level_category_name || "Supplier").slice(0, 80);
    drafts.push({
      name: title,
      price_kes: sale,
      original_price_kes: original != null && original > sale ? original : null,
      short_description: `${category}. Ships to Kenya from our supplier after you pay. Delivery is usually 7–20 days.`,
      image_url: image,
      category,
      source: "aliexpress",
      source_product_id: sourceId,
      source_url: httpsUrl(product.product_detail_url),
      rating: feedbackToStars(product.evaluate_rate),
      review_count: 0,
      orders_count: ordersCount(product.lastest_volume ?? product.latest_volume ?? product.volume),
      gallery_urls: gallery,
    });
  }
  return drafts;
}

async function fetchRawProducts(query: string, page: number, pageSize: number): Promise<RawProduct[]> {
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID?.trim() ?? "";
  const ids = productIdsFromQuery(query);
  const common = {
    tracking_id: trackingId,
    target_currency: "USD",
    target_language: "EN",
    ship_to_country: "KE",
  };
  const payload = ids.length
    ? await callAliExpress("aliexpress.affiliate.productdetail.get", {
        ...common,
        product_ids: ids.join(","),
      })
    : await callAliExpress("aliexpress.affiliate.product.query", {
        ...common,
        keywords: query,
        page_no: String(page),
        page_size: String(pageSize),
        sort: "LAST_VOLUME_DESC",
      });
  return asProductList(payload);
}

export async function pullAliExpressIntoCatalog(
  admin: SupabaseClient,
  input: { query: string; category?: string; page?: number; pageSize?: number }
): Promise<SupplierPullResult> {
  if (!aliexpressConfigured()) {
    return { configured: false, products: [] };
  }

  const query = input.query.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (query.length < 2) {
    return { configured: true, products: [], warning: "Enter at least 2 characters to search the supplier catalog." };
  }

  const page = Math.max(1, Math.min(20, Math.trunc(input.page ?? 1)));
  const pageSize = Math.max(1, Math.min(40, Math.trunc(input.pageSize ?? 20)));
  const category = String(input.category ?? "").trim().slice(0, 80);

  let raw: RawProduct[] = [];
  try {
    raw = await fetchRawProducts(query, page, pageSize);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supplier search failed.";
    return { configured: true, products: [], warning: message };
  }

  const drafts = toDrafts(raw, category).slice(0, pageSize);
  if (drafts.length === 0) {
    return { configured: true, products: [], warning: "No supplier products matched that search." };
  }

  const { data, error } = await admin
    .from("merchandise_items")
    .upsert(drafts, { onConflict: "source,source_product_id" })
    .select(MERCH_COLUMNS);

  if (error) {
    const missing = /column .* does not exist|merchandise_items_source_pid_key|schema cache|no unique|on conflict/i.test(
      error.message
    );
    return {
      configured: true,
      products: [],
      warning: missing
        ? "Run database/ticketing_voting_mvp_patch_108_merchandise_dropship.sql in Supabase, then search again."
        : error.message,
    };
  }

  return {
    configured: true,
    products: ((data ?? []) as Record<string, unknown>[]).map(mapMerchRow),
  };
}
