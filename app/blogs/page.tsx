import BlogsPageClient from "./BlogsPageClient";
import { metadata } from "./metadata";
import { getBlogIndexData } from "@/lib/blog-server";

export { metadata };

/** Refresh listing periodically so repeat views hit the server cache, not only client navigations. */
export const revalidate = 60;

export default async function BlogsPage() {
  const { posts, sidebarAds, trending } = await getBlogIndexData();
  return (
    <BlogsPageClient
      initialPosts={posts}
      initialSidebarAds={sidebarAds}
      initialTrending={trending}
    />
  );
}
