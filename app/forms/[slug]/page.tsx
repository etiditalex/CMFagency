import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import PublicForm from "@/components/forms/PublicForm";
import { blogImageOptimizeProps, resolveBlogImageSrc } from "@/lib/blog-image";
import { DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";
import { getPublishedFormBySlug } from "@/lib/forms-server";
import { SITE_URL } from "@/lib/site-url";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublishedFormBySlug(slug);
  if (!form) return { title: "Form", robots: { index: false, follow: true } };
  const description = form.excerpt || form.intro || `Complete the ${form.title} form from Changer Fusions.`;
  const url = `${SITE_URL}/forms/${form.slug}`;
  return {
    title: form.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: form.title,
      description,
      url,
      type: "website",
      locale: "en_KE",
      siteName: "Changer Fusions",
    },
  };
}

export default async function FormDetailPage({ params }: Props) {
  const { slug } = await params;
  const form = await getPublishedFormBySlug(slug);
  if (!form) notFound();
  if (form.href && form.href !== `/forms/${form.slug}`) redirect(form.href);
  const intro = form.intro?.trim() || form.excerpt?.trim() || "";
  const image = form.image_url ? resolveBlogImageSrc(form.image_url, DEFAULT_BLOG_CARD_IMAGE, form.slug) : null;

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-[#f3f1ec] px-4 pb-16 pt-28 sm:px-6 md:pt-32">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/forms" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-800">
          <ArrowLeft className="h-4 w-4" />
          Forms
        </Link>
        {image ? (
          <div className="relative mt-5 h-52 overflow-hidden rounded-2xl bg-gray-100 sm:h-64">
            <Image
              src={image}
              alt={form.title}
              fill
              {...blogImageOptimizeProps(image)}
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}
        <div className="mt-5">
          <span className="inline-flex rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white">
            {form.category || "Form"}
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 md:text-3xl">{form.title}</h1>
          {intro ? <p className="mt-3 text-sm leading-relaxed text-gray-700 sm:text-base">{intro}</p> : null}
        </div>
        <div className="mt-6">
          <PublicForm slug={form.slug} fields={form.fields} />
        </div>
      </div>
    </div>
  );
}
