"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Calendar, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

import BlogPromoHorizontalScroll from "@/components/blogs/BlogPromoHorizontalScroll";
import { DEFAULT_BLOG_AUTHOR } from "@/lib/blog-defaults";

const BlogNewsletterBannerPopup = dynamic(
  () => import("@/components/blogs/BlogNewsletterBannerPopup"),
  { ssr: false }
);
import type { BlogSidebarAdRow } from "@/lib/blog-server";
import { supabase } from "@/lib/supabase";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author: string | null;
  category: string | null;
  image_url: string | null;
  published_at: string | null;
};

const DEFAULT_CARD_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";

export default function BlogsPageClient() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [sidebarAds, setSidebarAds] = useState<BlogSidebarAdRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [postsRes, adsRes] = await Promise.all([
          supabase
            .from("fusion_blogs")
            .select("id, slug, title, excerpt, author, category, image_url, published_at")
            .not("published_at", "is", null)
            .order("published_at", { ascending: false }),
          supabase
            .from("fusion_blog_sidebar_ads")
            .select("id, title, image_url, href")
            .order("sort_order", { ascending: true }),
        ]);
        if (postsRes.error) throw postsRes.error;
        if (!cancelled) {
          setPosts((postsRes.data ?? []) as BlogPost[]);
          if (!adsRes.error && adsRes.data) {
            setSidebarAds(adsRes.data as BlogSidebarAdRow[]);
          } else {
            setSidebarAds([]);
          }
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
          setSidebarAds([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pt-20 min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <BlogNewsletterBannerPopup />
      <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 pb-8 sm:pb-10">
        {sidebarAds.length > 0 && (
          <div className="w-full max-w-full mb-5 sm:mb-8">
            <BlogPromoHorizontalScroll
              ads={sidebarAds}
              className="w-full"
              imageMaxClass="max-h-[min(200px,36dvh)] sm:max-h-[min(260px,42dvh)] md:max-h-[min(300px,48vh)]"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-6 lg:gap-8 w-full">
          {loading ? (
            <div className="col-span-full py-10 text-center text-gray-500 text-sm sm:text-base">Loading articles…</div>
          ) : posts.length === 0 ? (
            <div className="col-span-full py-10 text-center text-gray-500 text-sm sm:text-base">
              No published articles yet. Check back soon.
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden group w-full min-w-0"
              >
                <div className="relative h-40 sm:h-44 md:h-48 overflow-hidden">
                  <Image
                    src={post.image_url || DEFAULT_CARD_IMAGE}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-primary-600 text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold">
                      {post.category || "Blog"}
                    </span>
                  </div>
                </div>
                <div className="p-3 sm:p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-500 mb-2">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      {post.published_at ? format(new Date(post.published_at), "MMMM d, yyyy") : ""}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      <span className="truncate">{post.author || DEFAULT_BLOG_AUTHOR}</span>
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-3">
                    {post.title}
                  </h3>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
