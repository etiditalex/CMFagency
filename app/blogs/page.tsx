import BlogListingJsonLd from "@/components/blogs/BlogListingJsonLd";
import BlogsPageClient from "./BlogsPageClient";
import { metadata } from "./metadata";
import { getBlogIndexData } from "@/lib/blog-server";

export { metadata };

/** HTML still renders per request (root layout CSP nonce). Listing data is cached for 120s. */
export const revalidate = 120;

export default async function BlogsPage() {
  const { posts, sidebarAds, trending, columnPosts, listingTruncated } = await getBlogIndexData();
  return (
    <div className="pt-28 md:pt-32 min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <BlogListingJsonLd posts={posts} />
      <div className="w-full px-2 sm:px-3 md:px-5 lg:px-6 xl:px-8 2xl:px-10 mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Blogs &amp; News</h1>
      </div>
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
