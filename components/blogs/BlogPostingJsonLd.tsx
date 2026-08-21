import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { DEFAULT_BLOG_AUTHOR } from "@/lib/blog-defaults";
import { blogLastModifiedDate, type BlogPostRow } from "@/lib/blog-server";
import { SITE_URL } from "@/lib/site-url";

type Props = {
  post: BlogPostRow;
  canonicalUrl: string;
  imageUrl: string;
};

function wordCountFromBody(body: string | null): number | undefined {
  if (!body) return undefined;
  const text = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const n = text.split(" ").filter(Boolean).length;
  return n > 0 ? n : undefined;
}

export default function BlogPostingJsonLd({ post, canonicalUrl, imageUrl }: Props) {
  const datePublished = post.published_at ?? undefined;
  const modified = blogLastModifiedDate(post.published_at, post.updated_at);
  const dateModified = modified?.toISOString();
  const schemaType = post.category === "News" ? "NewsArticle" : "BlogPosting";
  const authorName = post.author?.trim() || DEFAULT_BLOG_AUTHOR;
  const words = wordCountFromBody(post.body);

  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": schemaType,
        "@id": `${canonicalUrl}#article`,
        headline: post.title,
        url: canonicalUrl,
        image: [imageUrl],
        inLanguage: "en-KE",
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
        ...(post.category ? { articleSection: post.category, keywords: post.category } : {}),
        ...(words ? { wordCount: words } : {}),
        author: { "@type": "Person", name: authorName },
        publisher: {
          "@type": "Organization",
          name: "Changer Fusions",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: BRAND_LOGO_URL },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        ...(post.excerpt?.trim() ? { description: post.excerpt.trim() } : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blogs & News", item: `${SITE_URL}/blogs` },
          { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
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
