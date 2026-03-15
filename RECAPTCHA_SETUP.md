# Google reCAPTCHA on Login

The login page shows a reCAPTCHA v2 (“I’m not a robot”) widget when the **site key** is set.

## 1. Create keys in Google reCAPTCHA

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin).
2. Register a new site:
   - **Label:** e.g. “CMF Agency Login”
   - **reCAPTCHA type:** “I’m not a robot” (v2)
   - **Domains:** add your production domain (e.g. `cmfagency.co.ke`) and, for local testing, `localhost`
3. Save. You’ll get a **Site key** and a **Secret key**.

## 2. Environment variables

Use these **exact** names:

| Variable | Where to use | Example |
|----------|----------------|--------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Vercel + `.env.local` | Site key from step 1 |
| `RECAPTCHA_SECRET_KEY` | Vercel + `.env.local` (server only) | Secret key from step 1 |

- The **site key** must be prefixed with `NEXT_PUBLIC_` so the browser can load the widget.
- If the name is wrong (e.g. `RECAPTCHA_SITE_KEY` without `NEXT_PUBLIC_`), the widget will not show.

## 3. Vercel

1. **Project → Settings → Environment Variables**
2. Add:
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` = your site key  
   - `RECAPTCHA_SECRET_KEY` = your secret key  
3. **Redeploy** the project (e.g. Deployments → … → Redeploy).  
   The login page loads the site key at **runtime** from `/api/recaptcha-site-key`, so once the env var is set and you redeploy, the widget will appear (no need to worry about build-time inlining).

## 4. Local

In `.env.local`:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

Restart the dev server after changing env vars.

## 5. If the widget still doesn’t show

- Confirm you’re on the **Sign In** form (not Sign Up); the widget only appears there.
- Confirm the variable name is exactly `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (no typo, no space).
- After changing env vars on Vercel, trigger a **new deployment** so the server can read the new value.
- Open DevTools → Network: check that `GET /api/recaptcha-site-key` returns `{ "siteKey": "your_key_here" }`. If `siteKey` is empty, the env var isn’t set or the deployment didn’t pick it up.
- Check the browser console for CSP or script-load errors; the app allows `https://www.google.com`, `https://www.gstatic.com`, and `https://www.recaptcha.net` for reCAPTCHA.
