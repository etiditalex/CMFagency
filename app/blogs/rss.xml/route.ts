import { getPublishedBlogsForFeed } from "@/lib/blog-server";
import { SITE_URL } from "@/lib/site-url";

export const revalidate = 300;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = SITE_URL;
  const posts = await getPublishedBlogsForFeed(50);
  const buildDate = new Date().toUTCString();

  const items = posts
    .map((p) => {
      const link = `${base}/blogs/${p.slug}`;
      const pub = new Date(p.published_at).toUTCString();
      const desc = p.excerpt?.trim() ? escapeXml(p.excerpt.trim()) : escapeXml(p.title);
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pub}</pubDate>
      <description>${desc}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Changer Fusions — Blogs &amp; News</title>
    <link>${base}/blogs</link>
    <description>Marketing insights, industry news, and updates from Changer Fusions.</description>
    <language>en-ke</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${base}/blogs/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
