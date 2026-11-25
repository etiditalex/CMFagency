import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import MerchandiseProductClient from "./MerchandiseProductClient";
import { loadProductById } from "@/lib/dropship/catalog";

export const revalidate = 300;

function asNumberId(raw: string | undefined): number | null {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function fetchProductById(id: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  try {
    return await loadProductById(supabase, id);
  } catch {
    return null;
  }
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
      type: "website",
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

