"use client";

import dynamic from "next/dynamic";

const BlogNewsletterBannerPopup = dynamic(
  () => import("@/components/blogs/BlogNewsletterBannerPopup"),
  { ssr: false }
);

/** Client wrapper — `ssr: false` is not allowed in Server Components. */
export default function BlogNewsletterLazy() {
  return <BlogNewsletterBannerPopup />;
}
