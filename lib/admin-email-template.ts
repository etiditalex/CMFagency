/**
 * Shared HTML template for admin dashboard emails (campaign + marketing).
 * Banner uses CMF Agency brand colors (primary blue, secondary green).
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Default Changer Fusions logo (used when logoUrl not provided). */
export const DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/dyfnobo9r/image/upload/v1774077348/Changer_fusions_logo_izdxjo.png";

/** Content-ID for inline logo attachment in email headers (use with Resend attachment contentId). */
export const CHANGER_LOGO_CID = "changer-logo";

export type AdminEmailTemplateOptions = {
  /** Brand / logo text (e.g. "CMF Agency", "Changer Fusions") */
  brandName?: string;
  /** Optional logo image URL (e.g. Changer Fusions logo). If not set, uses default Changer Fusions logo. */
  logoUrl?: string;
  /** When set, logo is rendered from inline attachment via <img src="cid:...">. Use with attachments containing contentId. */
  logoContentId?: string;
  /** Greeting line, e.g. "Hello Inuka Afrika" or "Hello" */
  greeting?: string;
  /** Subtext under greeting, e.g. "We've discovered new events for you!" */
  greetingSubtext?: string;
  /** Optional banner/hero image URL (shown on the right side of the dark banner) */
  bannerImageUrl?: string;
  /** Main HTML body content (already escaped or safe HTML) */
  bodyHtml: string;
  /** Optional section heading below the banner, e.g. "Events specially curated for you ✨" */
  sectionHeading?: string;
  /** Optional "Explore all" (or similar) link next to section heading */
  sectionLinkLabel?: string;
  sectionLinkUrl?: string;
  /** Footer line, e.g. "Sent via Fusion Xpress · CMF Agency" */
  footer?: string;
};

const DEFAULT_BRAND = "CMF Agency";
const DEFAULT_FOOTER = "Sent via Fusion Xpress · CMF Agency";

export function buildAdminEmailHtml(options: AdminEmailTemplateOptions): string {
  const {
    brandName = DEFAULT_BRAND,
    logoUrl,
    logoContentId,
    greeting = "Hello",
    greetingSubtext = "",
    bannerImageUrl,
    bodyHtml,
    sectionHeading = "",
    sectionLinkLabel = "",
    sectionLinkUrl = "",
    footer = DEFAULT_FOOTER,
  } = options;

  const safeBrand = escapeHtml(brandName);
  const safeGreeting = escapeHtml(greeting);
  const safeSubtext = escapeHtml(greetingSubtext);
  const safeFooter = escapeHtml(footer);
  const safeSectionHeading = escapeHtml(sectionHeading);
  const safeSectionLinkLabel = escapeHtml(sectionLinkLabel);
  const safeSectionLinkUrl =
    sectionLinkUrl.startsWith("https://") ? sectionLinkUrl.replace(/"/g, "&quot;").replace(/'/g, "&#39;") : "";

  const validLogoUrl =
    (logoUrl && logoUrl.startsWith("https://") ? logoUrl : DEFAULT_LOGO_URL).replace(/"/g, "&quot;");
  const validBannerUrl =
    bannerImageUrl && bannerImageUrl.startsWith("https://")
      ? bannerImageUrl.replace(/"/g, "&quot;")
      : "";

  const logoSrc = logoContentId ? `cid:${logoContentId}` : validLogoUrl;
  const logoBlock = `
    <div style="margin-bottom: 12px;">
      <img src="${logoSrc}" alt="${safeBrand}" width="140" height="48" style="height: 48px; width: auto; max-width: 180px; display: block;" />
    </div>`;

  const bannerImageBlock = validBannerUrl
    ? `
    <div style="flex: 0 0 180px; text-align: right;">
      <img src="${validBannerUrl}" alt="" width="140" height="140" style="width: 140px; height: 140px; object-fit: cover; border-radius: 12px; display: inline-block;" />
    </div>`
    : "";

  /* CMF Agency brand: primary-600 #1e58ca; section link larger for visibility (e.g. "Click here to view") */
  const sectionHeadingBlock =
    safeSectionHeading || (safeSectionLinkUrl && safeSectionLinkLabel)
      ? `
  <div style="margin: 24px 0 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
    ${safeSectionHeading ? `<h2 style="margin: 0; font-size: 1.125rem; font-weight: 700; color: #1f2937;">${safeSectionHeading}</h2>` : ""}
    ${safeSectionLinkUrl && safeSectionLinkLabel ? `<a href="${safeSectionLinkUrl}" style="color: #1e58ca; font-size: 1.0625rem; font-weight: 600; text-decoration: none;">${safeSectionLinkLabel}</a>` : ""}
  </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeBrand}</title>
</head>
<body style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 20px;">
    <!-- CMF Agency brand banner (primary blue → secondary green) -->
    <div style="background: linear-gradient(135deg, #153d86 0%, #0f2f64 40%, #165841 100%); border-radius: 12px; padding: 28px 24px; margin-bottom: 0; position: relative; overflow: hidden;">
      <!-- Subtle diagonal pattern -->
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.08; background: repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 10px);"></div>
      <div style="position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;">
        <div style="flex: 1; min-width: 0;">
          ${logoBlock}
          <p style="margin: 0 0 8px; font-size: 0.875rem; font-weight: 600; color: #a3d1df;">${safeBrand}</p>
          <h1 style="margin: 0 0 6px; font-size: 1.75rem; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">${safeGreeting}</h1>
          ${safeSubtext ? `<p style="margin: 0; font-size: 0.9375rem; color: rgba(255,255,255,0.9);">${safeSubtext}</p>` : ""}
        </div>
        ${bannerImageBlock}
      </div>
    </div>

    <!-- Content card -->
    <div style="background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 24px; margin-top: -1px; border: 1px solid #e5e7eb; border-top: none;">
      ${sectionHeadingBlock}
      <div style="white-space: pre-wrap; color: #374151; font-size: 0.9375rem; line-height: 1.7;">${bodyHtml}</div>
    </div>

    <p style="color: #6b7280; font-size: 11px; margin-top: 24px; text-align: center;">${safeFooter}</p>
  </div>
</body>
</html>`;
}
