import { allOptimizableImageHosts } from "@/lib/image-hosts";
import { SITE_URL } from "@/lib/site-url";

/** Control chars and backslashes can make `/\\evil.com` parse as a different origin. */
const UNSAFE_RAW_CHARS = /[\u0000-\u001F\u007F\\]/;

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, "");
}

function siteHostname(): string | null {
  try {
    return normalizeHostname(new URL(SITE_URL).hostname);
  } catch {
    return null;
  }
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Approved hosts for image redirects: this site plus known image CDNs. */
export function allowedImageRedirectHosts(): Set<string> {
  const hosts = new Set<string>();
  const site = siteHostname();
  if (site) {
    hosts.add(site);
    if (site.startsWith("www.")) hosts.add(site.slice(4));
    else hosts.add(`www.${site}`);
  }
  for (const host of allOptimizableImageHosts() as string[]) {
    if (host) hosts.add(normalizeHostname(host));
  }
  return hosts;
}

function isAllowedProtocol(url: URL): boolean {
  if (url.protocol === "https:") return true;
  return (
    url.protocol === "http:" &&
    process.env.NODE_ENV !== "production" &&
    isLocalDevHost(normalizeHostname(url.hostname))
  );
}

/**
 * Turn a DB/user-supplied image URL into an absolute redirect target only when
 * the host is on the allowlist. Returns null for untrusted or unparseable values
 * (including `data:` URIs, which must be served as bytes rather than redirected).
 */
export function resolveSafeImageRedirectUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || UNSAFE_RAW_CHARS.test(trimmed)) return null;
  if (/^data:/i.test(trimmed)) return null;

  let parsed: URL;
  try {
    if (trimmed.startsWith("//")) {
      parsed = new URL(`https:${trimmed}`);
    } else if (trimmed.startsWith("/")) {
      parsed = new URL(trimmed, `${SITE_URL}/`);
    } else {
      parsed = new URL(trimmed);
    }
  } catch {
    return null;
  }

  if (parsed.username || parsed.password) return null;
  if (!isAllowedProtocol(parsed)) return null;

  const host = normalizeHostname(parsed.hostname);
  if (!host) return null;

  const allowed = allowedImageRedirectHosts();
  if (process.env.NODE_ENV !== "production" && isLocalDevHost(host)) {
    allowed.add(host);
  }
  if (!allowed.has(host)) return null;

  parsed.hash = "";
  return parsed.href;
}
