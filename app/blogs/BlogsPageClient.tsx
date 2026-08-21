import { Calendar, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import BlogNewsletterLazy from "@/components/blogs/BlogNewsletterLazy";
import BlogPromoCarousel from "@/components/blogs/BlogPromoCarousel";
import BlogListingSidebar from "@/components/blogs/BlogListingSidebar";
import { DEFAULT_BLOG_AUTHOR, DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";
import { blogImageOptimizeProps, resolveBlogImageSrc } from "@/lib/blog-image";
import type {
  BlogColumnSidebarRow,
  BlogListingRow,
  BlogSidebarAdRow,
  BlogTrendingRow,
} from "@/lib/blog-server";

function formatBlogCardDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return "";
  }
}

type Props = {
  initialPosts: BlogListingRow[];
  initialSidebarAds: BlogSidebarAdRow[];
  initialTrending: BlogTrendingRow[];
  initialColumnPosts: BlogColumnSidebarRow[];
  listingTruncated: boolean;
};

export default function BlogsPageClient({
  initialPosts,
  initialSidebarAds,
  initialTrending,
  initialColumnPosts,
  listingTruncated,
}: Props) {
  return (
    <div className="min-h-0 w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <BlogNewsletterLazy />
      <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 pb-8 sm:pb-10">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8 xl:gap-10">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            {initialSidebarAds.length > 0 && (
              <div className="w-full max-w-xl lg:max-w-none mx-auto lg:mx-0">
                <BlogPromoCarousel ads={initialSidebarAds} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 md:gap-6 lg:gap-8 w-full">
              {initialPosts.length === 0 ? (
                <div className="col-span-full py-10 px-4 max-w-2xl mx-auto text-center text-gray-600 text-sm sm:text-base space-y-4">
                  <p className="font-semibold text-gray-800">We are preparing the next articles for you.</p>
                  <p>
                    In the meantime, explore{" "}
                    <Link href="/services/digital-marketing" className="text-primary-600 font-semibold underline hover:text-primary-700">
                      services
                    </Link>
                    , upcoming{" "}
                    <Link href="/events" className="text-primary-600 font-semibold underline hover:text-primary-700">
                      events
                    </Link>
                    , or reach the team on{" "}
                    <Link href="/contact" className="text-primary-600 font-semibold underline hover:text-primary-700">
                      Contact
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                initialPosts.map((post, idx) => {
                  const src = resolveBlogImageSrc(post.image_url, DEFAULT_BLOG_CARD_IMAGE, post.slug);
                  return (
                    <article
                      key={post.id}
                      className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group w-full min-w-0"
                    >
                      <Link href={`/blogs/${post.slug}`} className="block">
                        <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden bg-gray-100">
                          <Image
                            src={src}
                            alt={post.title}
                            fill
                            {...blogImageOptimizeProps(src)}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading={idx < 3 ? "eager" : "lazy"}
                            fetchPriority={idx === 0 ? "high" : "auto"}
                            priority={idx === 0}
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            quality={72}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="bg-primary-600 text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold">
                              {post.category || "Blog"}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="p-3 sm:p-4 md:p-5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 mb-2">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            {post.published_at ? (
                              <time dateTime={post.published_at}>{formatBlogCardDate(post.published_at)}</time>
                            ) : null}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                            <span className="truncate">{post.author || DEFAULT_BLOG_AUTHOR}</span>
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-3">
                          <Link href={`/blogs/${post.slug}`}>{post.title}</Link>
                        </h2>
                        <p className="text-gray-600 mb-3 text-sm sm:text-base line-clamp-3">{post.excerpt || ""}</p>
                        <Link
                          href={`/blogs/${post.slug}`}
                          className="inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 text-sm sm:text-base group/link"
                        >
                          <span>Read more</span>
                          <ArrowRight className="w-4 h-4 ml-1.5 group-hover/link:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            {listingTruncated && initialPosts.length > 0 && (
              <p className="text-center text-sm text-gray-600 max-w-2xl mx-auto">
                Showing the {initialPosts.length} most recent articles. Older posts stay available at their usual article
                URLs.
              </p>
            )}
          </div>

          <BlogListingSidebar trending={initialTrending} columnPosts={initialColumnPosts} />
        </div>
      </div>
    </div>
  );
}
