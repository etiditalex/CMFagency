import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Clock, FileText } from "lucide-react";

import { DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";
import { blogImageOptimizeProps } from "@/lib/blog-image";
import type { BlogColumnSidebarRow } from "@/lib/blog-server";

type Props = {
  posts: BlogColumnSidebarRow[];
  className?: string;
};

/**
 * Editorial "Columns" block: News & Business posts — featured card + compact list (matches classic news sidebar).
 */
export default function BlogColumnsWidget({ posts, className = "" }: Props) {
  if (posts.length === 0) return null;

  const [featured, ...rest] = posts;
  /** Matches reference layout: pill label for this editorial block. */
  const badgeLabel = "Columns";

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-extrabold tracking-[0.12em] text-gray-900 uppercase">Columns</h2>
          <FileText className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="relative mt-3">
          <div className="h-px w-full bg-gray-200" />
          <div className="absolute left-0 top-0 -translate-y-[1px] h-[3px] w-14 bg-gray-900 rounded-[1px]" />
        </div>
      </div>

      <div className="px-4 pt-4">
        <Link href={`/blogs/${featured.slug}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={featured.image_url?.trim() || DEFAULT_BLOG_CARD_IMAGE}
              alt={featured.title}
              fill
              {...blogImageOptimizeProps(featured.image_url?.trim() || DEFAULT_BLOG_CARD_IMAGE)}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 320px"
              quality={70}
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-2 right-2 bg-primary-600 text-white text-[10px] font-bold tracking-wide px-2 py-1 uppercase shadow-sm">
              {badgeLabel}
            </span>
          </div>
          <h3 className="mt-3 font-bold text-gray-900 text-sm leading-snug group-hover:text-primary-600 transition-colors line-clamp-4">
            {featured.title}
          </h3>
          {featured.published_at && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden />
              <time dateTime={featured.published_at}>{format(new Date(featured.published_at), "MMMM d, yyyy")}</time>
            </div>
          )}
        </Link>
      </div>

      {rest.length > 0 && (
        <ul className="px-4 pb-4 pt-5 mt-4 border-t border-gray-100 space-y-4">
          {rest.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blogs/${p.slug}`}
                className="flex gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-lg"
              >
                <div className="relative w-24 h-[4.25rem] shrink-0 overflow-hidden rounded-md bg-gray-100 border border-gray-100">
                  <Image
                    src={p.image_url?.trim() || DEFAULT_BLOG_CARD_IMAGE}
                    alt=""
                    fill
                    {...blogImageOptimizeProps(p.image_url?.trim() || DEFAULT_BLOG_CARD_IMAGE)}
                    className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    sizes="96px"
                    quality={65}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="font-bold text-gray-900 text-xs sm:text-[13px] leading-snug group-hover:text-primary-600 transition-colors line-clamp-3">
                    {p.title}
                  </p>
                  {p.published_at && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Clock className="w-3 h-3 shrink-0 text-gray-400" aria-hidden />
                      <time dateTime={p.published_at}>{format(new Date(p.published_at), "MMMM d, yyyy")}</time>
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
