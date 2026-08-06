/**
 * Single source of truth for hosts the Next.js image optimizer is allowed to fetch.
 * `next.config.js` builds its `remotePatterns` from this, and components use
 * {@link canOptimizeRemoteImage} to decide when to fall back to `unoptimized`
 * (uploads can point at arbitrary hosts, which the optimizer would reject).
 */

const OPTIMIZABLE_IMAGE_HOSTS = ["res.cloudinary.com", "images.unsplash.com", "upload.wikimedia.org"];

/**
 * Supabase project host is environment-specific, so it is resolved at runtime.
 * @returns {string | null}
 */
function supabaseImageHost() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname || null;
  } catch {
    return null;
  }
}

/** @returns {string[]} */
function allOptimizableImageHosts() {
  const supabase = supabaseImageHost();
  return supabase ? [...OPTIMIZABLE_IMAGE_HOSTS, supabase] : [...OPTIMIZABLE_IMAGE_HOSTS];
}

/**
 * True when Next.js can serve a resized/AVIF version of `src`. Contestant and campaign
 * artwork is user-supplied, so anything off-list must render as-is rather than 400.
 * @param {string | null | undefined} src
 * @returns {boolean}
 */
function canOptimizeRemoteImage(src) {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return allOptimizableImageHosts().includes(url.hostname);
  } catch {
    return false;
  }
}

module.exports = {
  OPTIMIZABLE_IMAGE_HOSTS,
  supabaseImageHost,
  allOptimizableImageHosts,
  canOptimizeRemoteImage,
};
