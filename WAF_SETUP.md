# WAF Setup (Fix “No WAF detected”)

Your scanner is flagging that the site is **not protected by a recognizable Web Application Firewall (WAF)**.

This repo now includes a **lightweight edge “WAF-style” blocker** in `proxy.ts` (blocks common probes), but most compliance scanners will still report “No WAF detected” unless you put the site behind a **managed WAF** (Cloudflare / AWS WAF / Vercel Firewall, etc.).

## Option A (Recommended): Cloudflare WAF (most scanners detect it)

1. **Add your domain** to Cloudflare (e.g. `cmfagency.co.ke`).
2. **Change nameservers** at your registrar to Cloudflare’s nameservers.
3. In Cloudflare dashboard:
   - **SSL/TLS**: set to **Full (strict)**.
   - **Security → WAF**:
     - Enable **Cloudflare Managed Rules**.
     - Enable **OWASP Core Ruleset** (or equivalent managed ruleset).
   - **Security → Bots**:
     - Turn on bot protections (e.g. Bot Fight Mode / Super Bot Fight Mode if available).
   - **Security → Rate limiting**:
     - Add rate limits for obvious abuse endpoints (login/verify/email/api).

Why this passes detection: Cloudflare adds identifiable headers (e.g. `cf-ray`) and blocks known attack signatures, which most tools recognize as a WAF.

## Option B: Vercel Firewall / WAF (if you deploy on Vercel)

1. Go to **Vercel Dashboard → Project → Security**.
2. Enable **Firewall / Managed Rules** (OWASP-style rules if available).
3. Add **Rate limiting** rules (at least for auth/email/API endpoints).

Note: Detection depends on the scanner; some only detect “big” WAF vendors via headers. Cloudflare is the most reliably detected.

## Included in codebase: Edge request blocking

The `proxy.ts` file performs best-effort blocking for common web attacks and probes:
- CMS probe paths (`/wp-admin`, `/wp-login.php`, `/.env`, `/.git`, …)
- Path traversal probes
- Basic SQLi/XSS patterns in query strings
- Very large request bodies (basic abuse control)

This helps protect the app even before you add a managed WAF, but it is **not a replacement** for a real WAF for compliance.

