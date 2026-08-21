import { SITE_URL } from "@/lib/site-url";
import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import type { BlogListingRow } from "@/lib/blog-server";

type Props = {
  posts: BlogListingRow[];
};

/**
 * Ranking metadata for /blogs. Lives in a JSON-LD script only — not shown in the page UI.
 */
export default function BlogListingJsonLd({ posts }: Props) {
  const pageUrl = `${SITE_URL}/blogs`;
  const items = posts.slice(0, 24);

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: "Blogs & News | Changer Fusions",
        description:
          "Stay updated with the latest insights, trends, and news from marketing, events, and business growth in Kenya. Expert articles from Changer Fusions.",
        inLanguage: "en-KE",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@type": "Thing", name: "Marketing, events, and business in Kenya" },
        publisher: { "@id": `${SITE_URL}/#organization` },
        mainEntity: { "@id": `${pageUrl}#blog` },
      },
      {
        "@type": "Blog",
        "@id": `${pageUrl}#blog`,
        name: "Changer Fusions Blogs & News",
        url: pageUrl,
        inLanguage: "en-KE",
        publisher: {
          "@type": "Organization",
          name: "Changer Fusions",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: BRAND_LOGO_URL },
        },
        blogPost: items.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          url: `${SITE_URL}/blogs/${post.slug}`,
          datePublished: post.published_at ?? undefined,
          ...(post.excerpt?.trim() ? { description: post.excerpt.trim() } : {}),
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#itemlist`,
        numberOfItems: items.length,
        itemListElement: items.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}/blogs/${post.slug}`,
          name: post.title,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blogs & News", item: pageUrl },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload).replace(/</g, "\\u003c") }}
    />
  );
}
