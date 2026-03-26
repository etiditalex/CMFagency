"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { renderBlogBodyToHtml } from "@/lib/blog-body";
import { DEFAULT_BLOG_AUTHOR } from "@/lib/blog-defaults";
import type { BlogPostRow, BlogSidebarAdRow, BlogTrendingRow } from "@/lib/blog-server";
import BlogPostSidebar from "@/components/blogs/BlogPostSidebar";

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";

type Props = {
  post: BlogPostRow;
  trending: BlogTrendingRow[];
  sidebarAds: BlogSidebarAdRow[];
};

export default function BlogSlugContent({ post, trending, sidebarAds }: Props) {
  const heroSrc =
    post.image_url?.trim().startsWith("//")
      ? `https:${post.image_url.trim()}`
      : post.image_url?.trim().startsWith("http://")
        ? `https://${post.image_url.trim().slice(7)}`
        : post.image_url || DEFAULT_IMAGE;

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
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

            {(post.image_url || DEFAULT_IMAGE) && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-10 shadow-md bg-gray-100">
                <img
                  src={heroSrc}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  fetchPriority="high"
                  decoding="async"
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
              <div
                className="blog-body text-gray-800 [&_figure]:mx-auto [&_figcaption_a]:text-primary-600"
                dangerouslySetInnerHTML={{ __html: renderBlogBodyToHtml(post.body) }}
              />
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
            </div>
          </main>

          <BlogPostSidebar trending={trending} sidebarAds={sidebarAds} />
        </div>
      </div>
    </div>
  );
}
