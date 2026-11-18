import Image from "next/image";
import Link from "next/link";
import { DEFAULT_BLOG_CARD_IMAGE } from "@/lib/blog-defaults";
import { blogImageOptimizeProps, resolveBlogImageSrc } from "@/lib/blog-image";
import type { HomeBlogNote } from "@/lib/blog-server";

function noteImage(post: HomeBlogNote) {
  return resolveBlogImageSrc(post.image_url, DEFAULT_BLOG_CARD_IMAGE, post.slug);
}

export default function HomeNotesSection({ posts }: { posts: HomeBlogNote[] }) {
  const [lead, ...rest] = posts;
  if (!lead) return null;

  const leadSrc = noteImage(lead);

  return (
    <section className="home-notes home-band home-band-paper home-arch" aria-labelledby="home-notes-heading">
      <div className="home-shell">
        <div className="home-notes-head">
          <h2 id="home-notes-heading" className="home-display">
            From the blog
          </h2>
          <Link href="/blogs" className="home-notes-all">
            Read all notes <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="home-notes-wrap">
          <Link href={lead.href || `/blogs/${lead.slug}`} className="home-notes-lead">
            <span className="home-notes-photo" aria-hidden>
              <Image
                src={leadSrc}
                alt=""
                fill
                sizes="(max-width: 760px) 100vw, 72vw"
                className="object-cover"
                {...blogImageOptimizeProps(leadSrc)}
              />
            </span>
            <span className="home-notes-copy">
              <span className="home-notes-topic">{lead.category || "Blog"}</span>
              <b className="home-notes-title">{lead.title}</b>
              {lead.excerpt ? <span className="home-notes-excerpt">{lead.excerpt}</span> : null}
              <span className="home-notes-btn">Read the article →</span>
            </span>
          </Link>

          {rest.length > 0 ? (
            <div className="home-notes-mini">
              {rest.map((post) => {
                const src = noteImage(post);
                return (
                  <Link key={post.slug} href={post.href || `/blogs/${post.slug}`} className="home-notes-pill">
                    <Image
                      src={src}
                      alt=""
                      width={52}
                      height={52}
                      className="home-notes-thumb"
                      {...blogImageOptimizeProps(src)}
                    />
                    <span>
                      <small>{post.category || "Blog"}</small>
                      <b>{post.title}</b>
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
