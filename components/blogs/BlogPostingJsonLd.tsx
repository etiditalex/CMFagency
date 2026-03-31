import { BRAND_LOGO_URL } from "@/lib/brand-logo";
import { DEFAULT_BLOG_AUTHOR } from "@/lib/blog-defaults";
import { blogLastModifiedDate, type BlogPostRow } from "@/lib/blog-server";

type Props = {
  post: BlogPostRow;
  canonicalUrl: string;
  imageUrl: string;
};

export default function BlogPostingJsonLd({ post, canonicalUrl, imageUrl }: Props) {
  const datePublished = post.published_at ?? undefined;
  const modified = blogLastModifiedDate(post.published_at, post.updated_at);
  const dateModified = modified?.toISOString();
  const schemaType = post.category === "News" ? "NewsArticle" : "BlogPosting";
  const authorName = post.author?.trim() || DEFAULT_BLOG_AUTHOR;

  const payload = {
    "@context": "https://schema.org",
    "@type": schemaType,
    headline: post.title,
    image: [imageUrl],
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    author: { "@type": "Person", name: authorName },
    publisher: {
      "@type": "Organization",
      name: "Changer Fusions",
      logo: { "@type": "ImageObject", url: BRAND_LOGO_URL },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    ...(post.excerpt?.trim() ? { description: post.excerpt.trim() } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}
