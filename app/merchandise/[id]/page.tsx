import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import MerchandiseProductClient, { type ProductDetail } from "./MerchandiseProductClient";

export const revalidate = 300;

function asNumberId(raw: string | undefined): number | null {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function fetchProductById(id: number): Promise<ProductDetail | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("merchandise_items")
    .select("id,name,price_kes,original_price_kes,short_description,image_url,category,in_stock,available_sizes,available_colors")
    .eq("is_active", true)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as any;
  return {
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
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = asNumberId(idRaw);
  if (!id) return { title: "Merchandise item | Changer Fusions" };

  const product = await fetchProductById(id);
  if (!product) return { title: "Merchandise item | Changer Fusions" };

  const url = `https://cmfagency.co.ke/merchandise/${product.id}`;
  const title = `${product.name} | Changer Fusions Merchandise`;
  const description =
    product.description?.trim() ||
    `Shop ${product.name} from Changer Fusions merchandise in Kenya. View price, options, and order online.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Changer Fusions",
      type: "product",
      images: product.image ? [{ url: product.image, alt: product.name }] : undefined,
    },
  };
}

export default async function MerchandiseProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await params;
  const id = asNumberId(idRaw);
  if (!id) notFound();

  const product = await fetchProductById(id);
  if (!product) notFound();

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image ? [product.image] : undefined,
    description: product.description || undefined,
    category: product.category || undefined,
    brand: { "@type": "Brand", name: "Changer Fusions" },
    offers: {
      "@type": "Offer",
      priceCurrency: "KES",
      price: product.price,
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://cmfagency.co.ke/merchandise/${product.id}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <MerchandiseProductClient product={product} />
    </>
  );
}

