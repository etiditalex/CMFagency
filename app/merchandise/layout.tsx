import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
const FALLBACK_OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1767037229/CoastFashionsandmodellingawards8_ifgxzv.jpg";

type MerchRow = { image_url: string; name: string } | null;

async function getTopMerchImage(): Promise<MerchRow> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("merchandise_items")
    .select("image_url,name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.image_url) return null;
  return { image_url: String(data.image_url), name: String(data.name ?? "Merchandise") };
}

export async function generateMetadata(): Promise<Metadata> {
  const url = `${SITE_URL}/merchandise`;
  const title = "Merchandise | Changer Fusions";
  const description =
    "Shop premium Changer Fusions merchandise — t-shirts, hoodies, bottles and more. Order online in Kenya.";

  const top = await getTopMerchImage();
  const imageUrl = top?.image_url || FALLBACK_OG_IMAGE;
  const imageAlt = top?.name ? `${top.name} | Changer Fusions Merchandise` : "Changer Fusions Merchandise";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "Changer Fusions",
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function MerchandiseLayout({ children }: { children: React.ReactNode }) {
  return children;
}

