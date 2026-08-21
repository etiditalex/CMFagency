import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, Clock, User, ArrowLeft } from "lucide-react";
import type { BlogBodyPart } from "@/lib/blog-body";
import { DEFAULT_BLOG_AUTHOR, DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";
import type {
  BlogColumnSidebarRow,
  BlogPostRow,
  BlogRelatedCard,
  BlogSidebarAdRow,
  BlogTrendingRow,
} from "@/lib/blog-server";
import BlogBodyWithDoubleClickShare from "@/components/blogs/BlogBodyWithDoubleClickShare";
import BlogPostSidebar from "@/components/blogs/BlogPostSidebar";
import BlogCmfaInlineBanner from "@/components/blogs/BlogCmfaInlineBanner";
import BlogEditorialDesk from "@/components/blogs/BlogEditorialDesk";
import BlogShareBar from "@/components/blogs/BlogShareBar";
import { SITE_URL } from "@/lib/site-url";
import { blogImageOptimizeProps } from "@/lib/blog-image";

type Props = {
  post: BlogPostRow;
  trending: BlogTrendingRow[];
  sidebarAds: BlogSidebarAdRow[];
  columnPosts: BlogColumnSidebarRow[];
  bodyParts: BlogBodyPart[];
  relatedBySlug: Record<string, BlogRelatedCard>;
};

function heroSrcFor(post: BlogPostRow): string {
  const u = post.image_url?.trim() ?? "";
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  return u || DEFAULT_BLOG_CARD_IMAGE;
}

function RelatedArticlesBlock({ slugs, relatedBySlug }: { slugs: string[]; relatedBySlug: Record<string, BlogRelatedCard> }) {
  const resolved = slugs.map((s) => relatedBySlug[s]).filter(Boolean) as BlogRelatedCard[];
  if (resolved.length === 0) return null;

  return (
    <section className="my-10 not-prose font-sans clear-both" aria-label="Related articles">
      <h2 className="font-bold text-lg md:text-xl text-gray-900">Related Articles</h2>
      <hr className="mt-2 mb-6 border-gray-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
        {resolved.map((p) => (
          <Link
            key={p.slug}
            href={`/blogs/${p.slug}`}
            className="flex gap-3 sm:gap-4 group text-left items-start"
          >
            <div className="relative w-28 h-20 sm:w-32 sm:h-[4.5rem] shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100">
              <Image
                src={p.image_url?.trim() || DEFAULT_BLOG_CARD_IMAGE}
                alt={p.title}
                fill
                {...blogImageOptimizeProps(p.image_url?.trim() || DEFAULT_BLOG_CARD_IMAGE)}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                sizes="(max-width: 640px) 112px, 128px"
                quality={65}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-primary-600 font-semibold text-base leading-snug group-hover:underline line-clamp-3">
                {p.title}
              </div>
              {p.published_at && (
                <div className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <span>{format(new Date(p.published_at), "MMMM d, yyyy")}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** In-article promo: float-left + natural aspect ratio so copy wraps beside it (news-style), not a stretched full-width strip. */
function EmbedAdBlock({ imageUrl, href, alt }: { imageUrl: string; href: string | null; alt: string }) {
  const img = (
    <img
      src={imageUrl}
      alt={alt}
      className="block w-full h-auto max-w-full rounded-lg border border-gray-100 shadow-sm bg-gray-50"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
  return (
    <figure
      className="blog-embed-ad-figure not-prose clear-left float-none sm:float-left w-full sm:w-[42%] sm:max-w-md min-w-0 sm:min-w-[10rem] max-w-xl mx-auto sm:mx-0 sm:mr-5 sm:mb-3 mt-2 mb-4"
    >
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden">
          {img}
        </a>
      ) : (
        img
      )}
    </figure>
  );
}

export default function BlogSlugContent({
  post,
  trending,
  sidebarAds,
  columnPosts,
  bodyParts,
  relatedBySlug,
}: Props) {
  const heroSrc = heroSrcFor(post);
  const shareUrl = `${SITE_URL}/blogs/${post.slug}`;

  return (
    <div className="pt-28 md:pt-32 min-h-screen bg-gray-50">
      <div className="container-blog py-10 md:py-12">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <div className="flex flex-col gap-10 lg:gap-12 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <main className="min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-8 sm:px-6 md:py-10 lg:px-8">
            <header className="mb-8">
              {post.category && (
                <span className="inline-block bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  {post.category}
                </span>
              )}
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600 text-sm md:text-base">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {post.published_at ? format(new Date(post.published_at), "MMMM d, yyyy") : ""}
                </span>
                <span className="inline-flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {post.author || DEFAULT_BLOG_AUTHOR}
                </span>
              </div>
            </header>

            {(post.image_url || DEFAULT_BLOG_CARD_IMAGE) && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-10 shadow-md bg-gray-100">
                <Image
                  src={heroSrc}
                  alt={post.title}
                  fill
                  {...blogImageOptimizeProps(heroSrc)}
                  className="absolute inset-0 w-full h-full object-cover"
                  fetchPriority="high"
                  priority
                  sizes="(max-width: 1024px) 100vw, 900px"
                  quality={78}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-600">
              {post.excerpt && (
                <p className="text-xl text-gray-600 border-l-4 border-primary-600 pl-4 mb-8 not-italic leading-[1.75]">
                  {post.excerpt}
                </p>
              )}
              <BlogBodyWithDoubleClickShare
                pageUrl={shareUrl}
                pageTitle={post.title}
                className="blog-body flow-root text-gray-800 [&_figure:not(.blog-embed-ad-figure)]:mx-auto [&_figcaption_a]:text-primary-600"
              >
                {bodyParts.map((part, idx) => {
                  if (part.type === "html") {
                    if (!part.html.trim()) return null;
                    return (
                      <div
                        key={`h-${idx}`}
                        dangerouslySetInnerHTML={{ __html: part.html }}
                      />
                    );
                  }
                  if (part.type === "related") {
                    return (
                      <RelatedArticlesBlock
                        key={`r-${idx}`}
                        slugs={part.slugs}
                        relatedBySlug={relatedBySlug}
                      />
                    );
                  }
                  return (
                    <EmbedAdBlock
                      key={`a-${idx}`}
                      imageUrl={part.imageUrl}
                      href={part.href}
                      alt={part.alt}
                    />
                  );
                })}
              </BlogBodyWithDoubleClickShare>
              {Array.isArray(post.external_links) && post.external_links.length > 0 && (
                <section className="mt-10 pt-8 border-t border-gray-200">
                  <h2 className="font-bold text-xl text-gray-900 mb-4">References &amp; further reading</h2>
                  <ul className="space-y-2">
                    {post.external_links
                      .filter(
                        (link) =>
                          link?.url &&
                          (link.url.startsWith("http://") || link.url.startsWith("https://"))
                      )
                      .map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 font-semibold hover:underline"
                          >
                            {link.label || link.url}
                          </a>
                        </li>
                      ))}
                  </ul>
                </section>
              )}
              <BlogShareBar url={shareUrl} title={post.title} />
              <BlogCmfaInlineBanner />
              <BlogEditorialDesk />
            </div>
          </main>

          <BlogPostSidebar trending={trending} sidebarAds={sidebarAds} columnPosts={columnPosts} />
        </div>
      </div>
    </div>
  );
}
