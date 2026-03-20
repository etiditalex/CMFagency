# Security Notes – CMF Agency

This document summarizes security measures and recommendations for the CMF Agency website.

## Implemented

### 1. Login brute-force protection (HIGH)
- **Rate limiting**: Middleware and API routes limit login attempts per IP (5 attempts per 15 minutes for verification code APIs; 10 per 15 minutes in middleware).
- **CAPTCHA**: Google reCAPTCHA v2 (checkbox) is supported on the login form. Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY` to enable. When the secret is set, the send-login-verification-code API requires a valid reCAPTCHA token.

### 2. Non-enumerable event IDs (HIGH)
- Public event URLs use **slugs** (e.g. `/events/upcoming/marketing-campaign-launch`) instead of sequential integer IDs.
- Legacy integer URLs (e.g. `/events/11`) redirect to the slug-based URL so existing links still work without exposing enumerable IDs.
- Use `getEventPathById(id)` from `lib/event-slugs.ts` for any new links to these events.

### 3. API authorization (HIGH)
- **`lib/api-auth.ts`** provides `requireAuth(request)` for protected API routes. Use it at the start of any route that must be authenticated:
  ```ts
  const auth = await requireAuth(req);
  if (!auth.authenticated) return auth.response;
  // then use auth.userId, auth.token
  ```
- **Action required**: Audit all `/api/*` routes that handle private data (applications, user records, internal events, wallet, certificate, gate, fusion-xpress, etc.) and wrap them with `requireAuth` (or role checks where applicable).

### 4. Input sanitization and XSS (MEDIUM)
- Contact form and other user input should be sanitized before storage and before rendering as HTML.
- Use a sanitization library (e.g. DOMPurify or isomorphic-dompurify) for any user-generated HTML. Prefer storing plain text and escaping on render; if you must store HTML, sanitize on input and again when rendering.
- **Action required**: Apply sanitization to all endpoints that accept user content (contact, applications, careers, event registrations) and to any UI that re-renders that content.

### 5. Unfinished / placeholder routes (LOW)
- Navigation links that pointed to `/page-not-found` have been updated to real routes where possible (e.g. Events Calendar → `/events/upcoming`, Portfolios → `/portfolios`, Training → `/training`, Job Board → `/jobs`). Remove or secure any remaining placeholder or unfinished endpoints before they go live.

---

## Recommendations (manual / config)

### 6. Cloudinary (MEDIUM)
- The Cloudinary **cloud name** appears in image URLs. If any **unsigned upload preset** is enabled in the Cloudinary dashboard, anyone could upload files to your account.
- **Action**: In Cloudinary dashboard, review **Upload** → **Upload presets**. Ensure all presets are **signed** or otherwise restricted (e.g. by folder, auth). Do not leave unsigned presets that allow arbitrary uploads.

### 7. Session storage – httpOnly cookies (MEDIUM)
- Supabase client currently uses **localStorage** for session tokens. If an XSS vulnerability exists anywhere on the site, a script could read the token and hijack the session.
- **Recommendation**: Use **httpOnly cookies** for session storage so JavaScript cannot access tokens. This typically involves:
  - Using `@supabase/ssr` with Next.js (createServerClient in middleware and API routes, createBrowserClient with cookie storage).
  - Storing the session in cookies in middleware and reading it in API routes and server components.
- See [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) for the recommended cookie-based setup. Migrating to this pattern improves resilience against XSS.

---

## Env vars (security-sensitive)

- `RECAPTCHA_SECRET_KEY` – Google reCAPTCHA secret (server-only). Enable CAPTCHA when set.
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` or `RECAPTCHA_SITE_KEY` – site key served to the login page via `/api/recaptcha-site-key`.
- `SUPABASE_SERVICE_ROLE_KEY` – Must never be exposed to the client.
- All Supabase and Resend keys should remain server-side except the documented `NEXT_PUBLIC_*` ones.
