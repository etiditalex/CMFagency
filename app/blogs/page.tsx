import BlogListingEditorialIntro from "@/components/blogs/BlogListingEditorialIntro";
import BlogsPageClient from "./BlogsPageClient";
import { metadata } from "./metadata";
import { getBlogIndexData } from "@/lib/blog-server";

export { metadata };

/** Refresh listing periodically so repeat views hit the server cache, not only client navigations. */
export const revalidate = 60;

export default async function BlogsPage() {
  const { posts, sidebarAds, trending, columnPosts, listingTruncated } = await getBlogIndexData();
  return (
    <div className="pt-20 min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-transparent">
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
