import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { parseBlogBodyParts } from "@/lib/blog-body";
import {
  blogLastModifiedDate,
  getApprovedBlogSidebarAds,
  getBlogBySlug,
  getBlogColumnsSidebarPosts,
  getBlogRelatedCardsBySlugs,
  getBlogTrendingExcluding,
} from "@/lib/blog-server";
import { resolveBlogShareImageUrl } from "@/lib/blog-share-image";
import BlogPostingJsonLd from "@/components/blogs/BlogPostingJsonLd";
import BlogSlugContent from "./BlogSlugContent";

const BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");

type Props = {
  params: Promise<{ slug: string }>;
};

/** Avoid prerendering every post at build (many parallel DB calls → Vercel 60s timeouts). SSR per request. */
export const dynamic = "force-dynamic";

/** Cache rendered pages after generation (on-demand). */
export const revalidate = 120;

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
  const modified = blogLastModifiedDate(post.published_at, post.updated_at);

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
      modifiedTime: modified?.toISOString(),
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

  const bodyParts = parseBlogBodyParts(post.body);
  const relatedSlugs = [...new Set(bodyParts.flatMap((p) => (p.type === "related" ? p.slugs : [])))];

  const [trending, sidebarAds, relatedRows, columnPosts] = await Promise.all([
    getBlogTrendingExcluding(slug, 6),
    getApprovedBlogSidebarAds(),
    getBlogRelatedCardsBySlugs(relatedSlugs),
    getBlogColumnsSidebarPosts(slug, 5),
  ]);

  const relatedBySlug: Record<string, (typeof relatedRows)[number]> = {};
  for (const r of relatedRows) relatedBySlug[r.slug] = r;

  const canonicalUrl = `${BASE_URL}/blogs/${post.slug}`;
  const shareImageUrl = resolveBlogShareImageUrl(post.slug, post.image_url);

  return (
    <>
      <BlogPostingJsonLd post={post} canonicalUrl={canonicalUrl} imageUrl={shareImageUrl} />
      <BlogSlugContent
        post={post}
        trending={trending}
        sidebarAds={sidebarAds}
        columnPosts={columnPosts}
        bodyParts={bodyParts}
        relatedBySlug={relatedBySlug}
      />
    </>
  );
}
