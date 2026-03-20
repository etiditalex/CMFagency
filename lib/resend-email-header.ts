/**
 * Shared header for transactional emails sent via Resend.
 * Solid blue banner, centered Changer Fusions logo, primary title + subtitle (portal-style layout).
 */
import { DEFAULT_LOGO_URL } from "@/lib/admin-email-template";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Professional solid blue (similar to public-sector portal headers) */
export const RESEND_EMAIL_HEADER_BG = "#1a4f8c";

export type ResendEmailHeaderOptions = {
  /** Shown under the logo, e.g. "Email verification", "Careers & applications" */
  subtitle: string;
  /** Large heading (default: CMF Agency) */
  primaryTitle?: string;
  /** Override logo URL (must be https). Default: Changer Fusions asset from Cloudinary */
  logoUrl?: string;
};

/**
 * Top-only banner: logo → primary title → subtitle. Use above a light content block.
 */
export function buildResendEmailHeaderHtml(options: ResendEmailHeaderOptions): string {
  const primary = escapeHtml((options.primaryTitle ?? "CMF Agency").trim() || "CMF Agency");
  const subtitle = escapeHtml(options.subtitle.trim());
  const envLogo = process.env.RESEND_EMAIL_LOGO_URL?.trim();
  const raw =
    options.logoUrl && options.logoUrl.startsWith("https://")
      ? options.logoUrl
      : envLogo && envLogo.startsWith("https://")
        ? envLogo
        : DEFAULT_LOGO_URL;
  const logo = raw.replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  return `<div style="background: ${RESEND_EMAIL_HEADER_BG}; padding: 28px 24px 26px; text-align: center; border-radius: 10px 10px 0 0;">
    <img src="${logo}" alt="Changer Fusions" width="220" height="80" style="max-height: 80px; max-width: 240px; width: auto; height: auto; display: block; margin: 0 auto 18px; border: 0; outline: none;" />
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; font-family: Arial, Helvetica, sans-serif; line-height: 1.3;">${primary}</h1>
    <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0; font-size: 15px; font-weight: 400; font-family: Arial, Helvetica, sans-serif; line-height: 1.4;">${subtitle}</p>
  </div>`;
}
