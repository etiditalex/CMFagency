import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import MerchandiseClient from "./MerchandiseClient";
import { loadActiveMerchandise, type MerchItem } from "@/lib/dropship/catalog";
import { getApprovedBlogSidebarAds } from "@/lib/blog-server";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Shop | Changer Fusions",
  description:
    "Shop Changer Fusions in Kenya. Browse products and supplier finds, pay in Kenya shillings with M-Pesa or card, and check out on this site.",
  alternates: { canonical: "https://cmfagency.co.ke/merchandise" },
  openGraph: {
    title: "Changer Fusions Shop",
    description: "Browse products and supplier finds. Prices in Kenya shillings. Checkout stays on this site.",
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
  try {
    return await loadActiveMerchandise(supabase);
  } catch {
    return [];
  }
}

export default async function MerchandisePage() {
  const [items, promoAds] = await Promise.all([fetchMerchandiseForSeo(), getApprovedBlogSidebarAds()]);
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Changer Fusions Shop",
    itemListElement: items.slice(0, 50).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      image: item.image,
      url: `https://cmfagency.co.ke/merchandise/${item.id}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <MerchandiseClient initialMerchandise={items} promoAds={promoAds} />
    </>
  );
}
