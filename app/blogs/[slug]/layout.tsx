import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const DEFAULT_OG_IMAGE = "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";
const BASE_URL = "https://cmfagency.co.ke";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!slug || !supabase) {
    return {
      title: "Blog | Changer Fusions",
      openGraph: { images: [DEFAULT_OG_IMAGE] },
      twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
    };
  }

  const { data: post } = await supabase
    .from("fusion_blogs")
    .select("title, excerpt, image_url")
    .eq("slug", slug)
    .not("published_at", "is", null)
    .maybeSingle();

  if (!post) {
    return {
      title: "Blog | Changer Fusions",
      openGraph: { images: [DEFAULT_OG_IMAGE] },
      twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
    };
  }

  const title = post.title || "Blog | Changer Fusions";
  const description = post.excerpt || "Read more on the Changer Fusions blog.";
  const imageUrl = post.image_url && post.image_url.startsWith("http") ? post.image_url : DEFAULT_OG_IMAGE;
  const url = `${BASE_URL}/blogs/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function BlogSlugLayout({ children }: Props) {
  return <>{children}</>;
}
