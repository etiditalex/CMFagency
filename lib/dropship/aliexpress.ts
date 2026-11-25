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
  return Boolean(envValue("ALIEXPRESS_APP_KEY") && envValue("ALIEXPRESS_APP_SECRET") && envValue("ALIEXPRESS_TRACKING_ID"));
}

type SignStyle =
  | "iop-sha256"
  | "iop-sha256-nomethod"
  | "top-hmac-sha256"
  | "top-md5"
  | "iop-md5"
  | "top-hmac-md5"
  | "rest-sha256";

let preferredStyle: SignStyle = "top-hmac-sha256";

function envValue(name: string): string {
  let value = process.env[name]?.trim() ?? "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function signRequest(style: SignStyle, apiName: string, params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== "" && !(style === "iop-sha256-nomethod" && key === "method"))
    .sort();
  let payload = style === "top-hmac-sha256" || style === "top-md5" || style === "top-hmac-md5" ? "" : apiName;
  for (const key of keys) payload += key + params[key];
  if (style === "top-md5" || style === "iop-md5") {
    return crypto
      .createHash("md5")
      .update(secret + payload + secret, "utf8")
      .digest("hex")
      .toUpperCase();
  }
  const algorithm = style === "top-hmac-md5" ? "md5" : "sha256";
  return crypto.createHmac(algorithm, secret).update(payload, "utf8").digest("hex").toUpperCase();
}

function signMethodFor(style: SignStyle): string {
  if (style === "top-hmac-sha256") return "hmac-sha256";
  if (style === "top-md5" || style === "iop-md5") return "md5";
  if (style === "top-hmac-md5") return "hmac";
  return "sha256";
}

function isSignatureError(message: string): boolean {
  return /signature does not conform|invalid signature|incompletesignature|isv\.invalid-signature/i.test(message);
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

function isProductRecord(item: RawProduct): boolean {
  return "product_id" in item || "productId" in item || "product_title" in item || "productTitle" in item;
}

function asProductList(node: unknown, depth = 0): RawProduct[] {
  if (typeof node === "string") {
    const text = node.trim();
    if (depth > 10 || (text[0] !== "{" && text[0] !== "[")) return [];
    try {
      return asProductList(JSON.parse(text), depth + 1);
    } catch {
      return [];
    }
  }
  if (node == null || depth > 10) return [];
  if (Array.isArray(node)) {
    const objects = node.filter((item) => item && typeof item === "object") as RawProduct[];
    if (objects.some(isProductRecord)) return objects;
    for (const item of objects) {
      const found = asProductList(item, depth + 1);
      if (found.length) return found;
    }
    return [];
  }
  if (typeof node !== "object") return [];
  const record = node as RawProduct;
  if (isProductRecord(record)) return [record];
  for (const value of Object.values(record)) {
    const found = asProductList(value, depth + 1);
    if (found.length) return found;
  }
  return [];
}

function apiErrorMessage(payload: unknown, depth = 0): string | null {
  if (!payload || typeof payload !== "object" || depth > 6) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const message = apiErrorMessage(item, depth + 1);
      if (message) return message;
    }
    return null;
  }
  const record = payload as Record<string, unknown>;
  const error = record.error_response;
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const msg = String(err.msg || err.sub_msg || err.message || "").trim();
    if (msg) return msg;
  }
  if ("code" in record && "message" in record && !("product_id" in record) && !("product_title" in record)) {
    const code = String(record.code ?? "").trim();
    const msg = String(record.message ?? "").trim();
    if (msg && code && code !== "0" && code !== "200") return msg;
  }
  if ("resp_code" in record || "resp_msg" in record) {
    const code = Number(record.resp_code);
    const msg = String(record.resp_msg ?? record.message ?? "").trim();
    if (Number.isFinite(code) && code !== 200 && code !== 0) return msg || "AliExpress rejected the request.";
  }
  for (const value of Object.values(record)) {
    const message = apiErrorMessage(value, depth + 1);
    if (message) return message;
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
  const match = String(amountRaw ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  const amount = match ? Number(match[0]) : Number.NaN;
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

const SIGN_STYLES: SignStyle[] = ["top-hmac-sha256", "top-md5", "iop-sha256-nomethod", "rest-sha256"];

async function postAliExpress(method: string, business: Record<string, string>, style: SignStyle): Promise<unknown> {
  const appKey = envValue("ALIEXPRESS_APP_KEY");
  const secret = envValue("ALIEXPRESS_APP_SECRET");
  const apiName = style === "rest-sha256" ? `/${method.replace(/\./g, "/")}` : method;
  const configuredEndpoint = envValue("ALIEXPRESS_API_URL");
  const endpoint =
    style === "rest-sha256"
      ? `https://api-sg.aliexpress.com/rest${apiName}`
      : configuredEndpoint || "https://api-sg.aliexpress.com/sync";
  const params: Record<string, string> = {
    app_key: appKey,
    timestamp: String(Date.now()),
    sign_method: signMethodFor(style),
    ...business,
  };
  if (style !== "rest-sha256") params.method = method;
  params.sign = signRequest(style, apiName, params, secret);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(8000),
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
  return payload;
}

async function callAliExpress(method: string, business: Record<string, string>): Promise<unknown> {
  const ordered = [preferredStyle, ...SIGN_STYLES.filter((style) => style !== preferredStyle)];
  let lastSignatureError = "AliExpress rejected the app signature.";
  for (const style of ordered) {
    try {
      const payload = await postAliExpress(method, business, style);
      const message = apiErrorMessage(payload);
      if (message && isSignatureError(message)) {
        lastSignatureError = message;
        continue;
      }
      if (message) throw new Error(message);
      preferredStyle = style;
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (isSignatureError(message) || /not JSON|request failed \(\d+\)|aborted|timeout|api path is invalid/i.test(message)) {
        if (isSignatureError(message)) lastSignatureError = message;
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    `${lastSignatureError} Check that ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET are the Open Platform App Key and App Secret, with no extra quotes.`
  );
}

function productField(product: RawProduct, names: string[]): unknown {
  for (const name of names) {
    if (product[name] != null && product[name] !== "") return product[name];
  }
  return undefined;
}

function toDrafts(products: RawProduct[], categoryLabel: string) {
  const drafts = [];
  for (const product of products) {
    const sourceId = String(productField(product, ["product_id", "productId", "item_id", "itemId"]) ?? "").replace(/\D/g, "");
    const small = product.product_small_image_urls ?? product.productSmallImageUrls;
    const smallList = Array.isArray(small)
      ? small
      : small && typeof small === "object" && Array.isArray((small as { string?: unknown }).string)
        ? (small as { string: unknown[] }).string
        : [];
    const image = httpsUrl(
      productField(product, ["product_main_image_url", "productMainImageUrl", "image_url", "product_image"]) ?? smallList[0]
    );
    const title = String(productField(product, ["product_title", "productTitle", "title", "product_name"]) ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    if (!sourceId || !image || !title) continue;
    const currency = productField(product, [
      "target_sale_price_currency",
      "sale_price_currency",
      "target_original_price_currency",
      "targetSalePriceCurrency",
    ]);
    const sale = moneyToKes(
      productField(product, [
        "target_sale_price",
        "target_app_sale_price",
        "app_sale_price",
        "sale_price",
        "targetSalePrice",
        "appSalePrice",
        "salePrice",
      ]),
      currency
    );
    if (sale == null) continue;
    const original = moneyToKes(
      product.target_original_price ?? product.original_price ?? product.app_original_price,
      product.target_original_price_currency || currency
    );
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
      source_url: httpsUrl(product.product_detail_url ?? product.productDetailUrl),
      rating: feedbackToStars(product.evaluate_rate),
      review_count: 0,
      orders_count: ordersCount(product.lastest_volume ?? product.latest_volume ?? product.volume),
      gallery_urls: gallery,
    });
  }
  return drafts;
}

const SEARCH_METHODS = [
  "aliexpress.affiliate.hotproduct.query",
  "aliexpress.affiliate.product.query",
  "aliexpress.affiliate.product.smartmatch",
];

async function fetchRawProducts(query: string, page: number, pageSize: number): Promise<RawProduct[]> {
  const trackingId = envValue("ALIEXPRESS_TRACKING_ID");
  const ids = productIdsFromQuery(query);
  const base = {
    tracking_id: trackingId,
    target_currency: "USD",
    target_language: "EN",
    page_no: String(page),
    page_size: String(pageSize),
  };
  const methods = ids.length ? ["aliexpress.affiliate.productdetail.get"] : SEARCH_METHODS;

  for (const method of methods) {
    const params: Record<string, string> = { ...base };
    if (method === "aliexpress.affiliate.productdetail.get") params.product_ids = ids.join(",");
    else params.keywords = query;
    if (method !== "aliexpress.affiliate.product.smartmatch" && method !== "aliexpress.affiliate.productdetail.get") {
      params.sort = "SALE_PRICE_ASC";
    }
    try {
      const payload = await callAliExpress(method, params);
      const products = asProductList(payload);
      if (products.length > 0) return products;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/tracking/i.test(message)) throw error;
    }
  }

  return [];
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
  } catch {
    return { configured: true, products: [], warning: "Supplier products are not available right now." };
  }

  const drafts = toDrafts(raw, category).slice(0, pageSize);
  if (drafts.length === 0) {
    return { configured: true, products: [], warning: "No products matched that search." };
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
