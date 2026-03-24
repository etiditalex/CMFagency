import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBlogBySlug } from "@/lib/blog-server";
import { resolveBlogShareImageUrl } from "@/lib/blog-share-image";
import BlogSlugContent from "./BlogSlugContent";

const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogBySlug(slug);

  if (!post) {
    const fallback = resolveBlogShareImageUrl(slug, null);
    return {
      title: "Blog | Changer Fusions",
      openGraph: {
        siteName: "Changer Fusions",
        images: [{ url: fallback, width: 1200, height: 630, alt: "Changer Fusions blog" }],
      },
      twitter: { card: "summary_large_image", images: [fallback] },
    };
  }

  const title = post.title || "Blog | Changer Fusions";
  const description = post.excerpt || "Read more on the Changer Fusions blog.";
  const imageUrl = resolveBlogShareImageUrl(slug, post.image_url);
  const url = `${BASE_URL}/blogs/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Changer Fusions",
      type: "article",
      publishedTime: post.published_at ?? undefined,
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
