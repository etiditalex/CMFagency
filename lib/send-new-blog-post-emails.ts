import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isSafeHref(url: string): boolean {
  const t = url.trim().toLowerCase();
  return t.startsWith("https://") || t.startsWith("http://");
}

function isHttpsImageSrc(url: string): boolean {
  return url.trim().toLowerCase().startsWith("https://");
}

/** Wider promo art for retina-friendly ~280px layout width without upscaling blur. */
const EMAIL_PROMO_MAX_W = 560;

/**
 * If the asset is on Cloudinary, request a bounded-width, auto-format delivery so
 * email clients are not forced to upscale tiny originals (reduces blocky/pixelated promos).
 */
function optimizePromoImageUrlForEmail(url: string): string {
  const u = url.trim();
  if (!u.includes("res.cloudinary.com/") || !u.includes("/upload/")) return u;
  if (/\bc_limit,w_\d+/.test(u) || /\/upload\/f_auto[,/]/.test(u)) return u;
  const insertion = `f_auto,q_auto,c_limit,w_${EMAIL_PROMO_MAX_W}`;
  return u.replace("/upload/", `/upload/${insertion}/`);
}

export type NewBlogEmailPromo = {
  title: string;
  image_url: string | null;
  href: string | null;
};

function buildSidebarPromosEmailBlock(promos: NewBlogEmailPromo[], blogsListingUrl: string): string {
  const rows = promos.filter((p) => p.title?.trim() || p.image_url?.trim() || p.href?.trim());
  if (rows.length === 0) return "";

  const cards = rows.slice(0, 6).map((p) => {
    const titleText = escapeHtml((p.title ?? "").trim() || "Featured");
    const hrefRaw = (p.href ?? "").trim();
    const href = isSafeHref(hrefRaw) ? hrefRaw : blogsListingUrl;
    const hrefEsc = escapeHtml(href);
    const imgRaw = (p.image_url ?? "").trim();
    const showImg = imgRaw && isHttpsImageSrc(imgRaw);
    const imgForEmail = showImg ? optimizePromoImageUrlForEmail(imgRaw) : "";
    const imgEsc = showImg ? escapeHtml(imgForEmail) : "";
    const imgAlt = escapeHtml((p.title ?? "").trim() || "Promotion");
    // Do not use a large HTML width= (e.g. 520): clients upscale small images → blurry. Cap display ~280px wide, ~240px tall.
    const imgBlock = showImg
      ? `<a href="${hrefEsc}" style="text-decoration:none;display:block;text-align:center;line-height:0;"><img src="${imgEsc}" alt="${imgAlt}" style="display:block;max-width:280px;width:auto;height:auto;max-height:240px;margin:0 auto;border:0;border-radius:8px;background:#f3f4f6;object-fit:contain;object-position:center;vertical-align:middle;-ms-interpolation-mode:bicubic;" /></a>`
      : "";
    const titleLine = `<p style="margin:${showImg ? "10px" : "0"} 0 0;font-size:14px;line-height:1.4;"><a href="${hrefEsc}" style="color:#1a4f8c;font-weight:600;text-decoration:underline;">${titleText}</a></p>`;
    return `<div style="margin:0 0 16px;padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;">${imgBlock}${titleLine}</div>`;
  });

  return `
      <div style="margin: 24px 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em;">Also on the blog (sidebar promos)</p>
        ${cards.join("")}
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">These are the same promotions shown beside articles on our website.</p>
      </div>`;
}

/**
 * Sends one new-article notification per recipient via Resend (individual emails for privacy).
 */
export async function sendNewBlogPostNotificationEmails(params: {
  recipients: string[];
  postTitle: string;
  postExcerpt: string | null;
  postSlug: string;
  /** Approved sidebar ads (same as blog article sidebar); optional */
  sidebarPromos?: NewBlogEmailPromo[];
}): Promise<{ sent: number; failed: number }> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || params.recipients.length === 0) {
    return { sent: 0, failed: params.recipients.length };
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://cmfagency.co.ke").replace(/\/$/, "");
  const postUrl = `${base}/blogs/${encodeURIComponent(params.postSlug)}`;
  const title = escapeHtml(params.postTitle.trim() || "New article");
  const excerptRaw = params.postExcerpt?.trim();
  const excerptBlock = excerptRaw
    ? `<p style="margin: 0 0 20px; font-size: 15px; color: #4b5563;">${escapeHtml(excerptRaw)}</p>`
    : "";

  const blogsListingUrl = `${base}/blogs`;
  const promosBlock = buildSidebarPromosEmailBlock(params.sidebarPromos ?? [], blogsListingUrl);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    ${buildResendEmailHeaderHtml({
      primaryTitle: "Changer Fusions",
      subtitle: "New on the blog",
    })}
    <div style="background: #ffffff; padding: 28px 24px 32px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
      <h2 style="color: #111827; margin: 0 0 12px; font-size: 20px;">${title}</h2>
      ${excerptBlock}
      <div style="text-align: center; margin: 0 0 16px;">
        <a href="${escapeHtml(postUrl)}" style="display: inline-block; background: #1a4f8c; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 8px;">Read the article</a>
      </div>
      ${promosBlock}
      <p style="margin: 16px 0 0; font-size: 13px; color: #9ca3af;">
        You are receiving this because you subscribed to updates from Changer Fusions.
      </p>
    </div>
  </div>
</body>
</html>`;

  let sent = 0;
  let failed = 0;
  const subject = `New article: ${params.postTitle.trim() || "Changer Fusions blog"}`;

  for (const to of params.recipients) {
    const addr = to.trim().toLowerCase();
    if (!addr) continue;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [addr],
          subject,
          html,
        }),
      });
      if (res.ok) sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  return { sent, failed };
}
