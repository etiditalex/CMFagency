import { fromEmail } from "@/lib/resend";
import { buildResendEmailHeaderHtml } from "@/lib/resend-email-header";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends one new-article notification per recipient via Resend (individual emails for privacy).
 */
export async function sendNewBlogPostNotificationEmails(params: {
  recipients: string[];
  postTitle: string;
  postExcerpt: string | null;
  postSlug: string;
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
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
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
