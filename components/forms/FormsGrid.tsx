import { Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { blogImageOptimizeProps, resolveBlogImageSrc } from "@/lib/blog-image";
import { DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";
import { formatFormDate } from "@/lib/fusion-forms";
import type { FormListingRow } from "@/lib/forms-server";

export default function FormsGrid({ forms }: { forms: FormListingRow[] }) {
  return (
    <div className="min-h-0 w-full max-w-[100vw] overflow-x-hidden bg-transparent">
      <div className="w-full px-2 pb-8 sm:px-3 sm:pb-10 md:px-5 lg:px-6 xl:px-8 2xl:px-10">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:gap-8 xl:grid-cols-3">
          {forms.length === 0 ? (
            <div className="col-span-full mx-auto max-w-2xl space-y-4 px-4 py-10 text-center text-sm text-gray-600 sm:text-base">
              <p className="font-semibold text-gray-800">Forms will appear here once they are published.</p>
              <p>
                In the meantime, explore{" "}
                <Link href="/events" className="font-semibold text-primary-600 underline hover:text-primary-700">
                  events
                </Link>
                , read{" "}
                <Link href="/blogs" className="font-semibold text-primary-600 underline hover:text-primary-700">
                  blogs
                </Link>
                , or reach the team on{" "}
                <Link href="/contact" className="font-semibold text-primary-600 underline hover:text-primary-700">
                  Contact
                </Link>
                .
              </p>
            </div>
          ) : (
            forms.map((form, idx) => {
              const src = resolveBlogImageSrc(form.image_url, DEFAULT_BLOG_CARD_IMAGE, form.slug);
              const dateLabel = formatFormDate(form.published_at);
              const href = form.href || `/forms/${form.slug}`;
              return (
                <article
                  key={form.id}
                  className="group w-full min-w-0 overflow-hidden rounded-xl border border-gray-200/80 bg-white/95 shadow-md backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg"
                >
                  <Link href={href} className="block">
                    <div className="relative h-40 overflow-hidden bg-gray-100 sm:h-44 md:h-48">
                      <Image
                        src={src}
                        alt={form.title}
                        fill
                        {...blogImageOptimizeProps(src)}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading={idx < 3 ? "eager" : "lazy"}
                        fetchPriority={idx === 0 ? "high" : "auto"}
                        priority={idx === 0}
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        quality={72}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute left-3 top-3">
                        <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-semibold text-white sm:px-3 sm:py-1 sm:text-sm">
                          {form.category || "Form"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="p-3 sm:p-4 md:p-5">
                    {dateLabel ? (
                      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 sm:text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                          <time dateTime={form.published_at ?? undefined}>{dateLabel}</time>
                        </span>
                      </div>
                    ) : null}
                    <h2 className="mb-2 line-clamp-3 text-base font-bold text-gray-900 transition-colors group-hover:text-primary-600 sm:text-lg">
                      <Link href={href}>{form.title}</Link>
                    </h2>
                    <p className="mb-3 line-clamp-3 text-sm text-gray-600 sm:text-base">{form.excerpt || ""}</p>
                    <Link
                      href={href}
                      className="group/link inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 sm:text-base"
                    >
                      <span>Open form</span>
                      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover/link:translate-x-0.5" />
                    </Link>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
