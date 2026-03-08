import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBlogBySlug } from "@/lib/blog-server";
import BlogSlugContent from "./BlogSlugContent";

const DEFAULT_OG_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";
const BASE_URL = "https://cmfagency.co.ke";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return {
      title: "Blog | Changer Fusions",
      openGraph: { images: [DEFAULT_OG_IMAGE] },
      twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE] },
    };
  }

  const title = post.title || "Blog | Changer Fusions";
  const description = post.excerpt || "Read more on the Changer Fusions blog.";
  const imageUrl =
    post.image_url && post.image_url.startsWith("http") ? post.image_url : DEFAULT_OG_IMAGE;
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

export default async function BlogSlugPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Link
            href="/blogs"
            className="text-primary-600 font-semibold hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return <BlogSlugContent post={post} />;
}
