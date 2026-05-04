import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import MerchandiseClient, { type MerchItem } from "./MerchandiseClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Merchandise | Changer Fusions",
  description:
    "Shop Changer Fusions branded merchandise in Kenya — premium apparel and accessories. Browse categories, view product images, and order online.",
  alternates: { canonical: "https://cmfagency.co.ke/merchandise" },
  openGraph: {
    title: "Changer Fusions Merchandise",
    description:
      "Shop Changer Fusions branded merchandise — premium apparel and accessories. View products, prices, and categories.",
    url: "https://cmfagency.co.ke/merchandise",
    siteName: "Changer Fusions",
    type: "website",
  },
};

async function fetchMerchandiseForSeo(): Promise<MerchItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return [];

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("merchandise_items")
    .select("id,name,price_kes,original_price_kes,short_description,image_url,category,in_stock,available_sizes,available_colors")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? ""),
    price: Number(row.price_kes ?? 0),
    originalPrice: row.original_price_kes == null ? null : Number(row.original_price_kes),
    image: String(row.image_url ?? ""),
    category: String(row.category ?? ""),
    description: String(row.short_description ?? ""),
    inStock: Boolean(row.in_stock),
    sizes: Array.isArray(row.available_sizes) ? row.available_sizes.filter(Boolean) : [],
    colors: Array.isArray(row.available_colors) ? row.available_colors.filter(Boolean) : [],
    rating: 0,
    reviews: 0,
  })) as MerchItem[];
}

export default async function MerchandisePage() {
  const items = await fetchMerchandiseForSeo();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Changer Fusions Merchandise",
    itemListElement: items.slice(0, 50).map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      image: it.image,
      url: "https://cmfagency.co.ke/merchandise",
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <MerchandiseClient initialMerchandise={items} />
    </>
  );
}
