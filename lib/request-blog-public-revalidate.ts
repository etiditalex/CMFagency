/**
 * Purge Next.js ISR for blog listing, article, sitemap, and RSS after CMS changes.
 * Call from dashboard (client) with the signed-in user's access token.
 */
export async function requestBlogPublicRevalidate(
  accessToken: string,
  opts: { slug: string; previousSlug?: string }
): Promise<void> {
  await fetch("/api/revalidate/blog", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: opts.slug,
      ...(opts.previousSlug && opts.previousSlug !== opts.slug ? { previousSlug: opts.previousSlug } : {}),
    }),
  });
}
