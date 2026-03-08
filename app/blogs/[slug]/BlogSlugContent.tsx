"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { renderBlogBodyToHtml } from "@/lib/blog-body";
import type { BlogPostRow } from "@/lib/blog-server";

const DEFAULT_IMAGE =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1765955876/WhatsApp_Image_2025-12-17_at_9.31.49_AM_m3hebl.jpg";

type Props = {
  post: BlogPostRow;
};

export default function BlogSlugContent({ post }: Props) {
  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      <article className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          {post.category && (
            <span className="inline-block bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
              {post.category}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {post.published_at ? format(new Date(post.published_at), "MMMM d, yyyy") : ""}
            </span>
            <span className="inline-flex items-center gap-2">
              <User className="w-4 h-4" />
              {post.author || "Changer Fusions Team"}
            </span>
          </div>
        </motion.header>

        {(post.image_url || DEFAULT_IMAGE) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative w-full aspect-video rounded-xl overflow-hidden mb-10 shadow-lg"
          >
            <Image
              src={post.image_url || DEFAULT_IMAGE}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-600"
        >
          {post.excerpt && (
            <p className="text-xl text-gray-600 border-l-4 border-primary-600 pl-4 mb-8 italic">
              {post.excerpt}
            </p>
          )}
          <div
            className="blog-body text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderBlogBodyToHtml(post.body) }}
          />
          {Array.isArray(post.external_links) && post.external_links.length > 0 && (
            <section className="mt-10 pt-8 border-t border-gray-200">
              <h2 className="font-bold text-xl text-gray-900 mb-4">References &amp; further reading</h2>
              <ul className="space-y-2">
                {post.external_links
                  .filter(
                    (link) =>
                      link?.url &&
                      (link.url.startsWith("http://") || link.url.startsWith("https://"))
                  )
                  .map((link, idx) => (
                    <li key={idx}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 font-semibold hover:underline"
                      >
                        {link.label || link.url}
                      </a>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </motion.div>
      </article>
    </div>
  );
}
