import BlogListingEditorialIntro from "@/components/blogs/BlogListingEditorialIntro";
import BlogsPageClient from "./BlogsPageClient";
import { metadata } from "./metadata";
import { getBlogIndexData } from "@/lib/blog-server";

export { metadata };

/** Avoid prerendering the full index at build (many Supabase reads → Vercel timeouts). */
export const dynamic = "force-dynamic";

export default async function BlogsPage() {
  const { posts, sidebarAds, trending, columnPosts, listingTruncated } = await getBlogIndexData();
  return (
    <div className="pt-28 md:pt-32 min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <BlogListingEditorialIntro />
      <BlogsPageClient
        initialPosts={posts}
        initialSidebarAds={sidebarAds}
        initialTrending={trending}
        initialColumnPosts={columnPosts}
        listingTruncated={listingTruncated}
      />
    </div>
  );
}
