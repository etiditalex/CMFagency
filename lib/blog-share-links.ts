/** Build outbound share URLs for blog posts (client- and server-safe). */

export function buildFacebookSharerUrl(url: string): string {
  return `https://www.facebook.com/sharer.php?u=${encodeURIComponent(url)}`;
}

/** Opens Twitter / X compose with URL and optional text. */
export function buildTwitterIntentUrl(url: string, text: string): string {
  const params = new URLSearchParams({ url });
  if (text.trim()) params.set("text", text.trim());
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildLinkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

/**
 * Messenger “Send” dialog needs a Meta app id.
 * Without NEXT_PUBLIC_FACEBOOK_APP_ID we fall back to the standard Facebook sharer
 * so the control still does something useful.
 */
export function buildMessengerShareUrl(pageUrl: string): string {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim();
  if (appId) {
    const u = encodeURIComponent(pageUrl);
    return `https://www.facebook.com/dialog/send?link=${u}&redirect_uri=${u}&app_id=${encodeURIComponent(appId)}`;
  }
  return buildFacebookSharerUrl(pageUrl);
}

export function buildMailtoShareUrl(subject: string, body: string): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:?${params.toString()}`;
}
