# Google reCAPTCHA on Login

The login page can use **reCAPTCHA v3** (floating **Privacy – Terms** badge at the bottom-right, invisible challenge) or **v2** (“I’m not a robot” checkbox). Your **site key type in Google Admin must match** the mode you choose.

## v3 vs v2 (quick choice)

| | **v3** (badge in corner) | **v2** (checkbox) |
|---|--------------------------|-------------------|
| Google Admin type | **Score based** (v3) | **“I’m not a robot”** (v2) |
| Env | Add `NEXT_PUBLIC_RECAPTCHA_VERSION=v3` | Omit it or set `v2` (default) |
| UX | Badge + token on **Sign in** click | User ticks the box before sign-in |

## 1. Create keys in Google reCAPTCHA

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin).
2. Register a new site:
   - **Label:** e.g. “CMF Agency Login”
   - **reCAPTCHA type:** choose **v3** (for the corner badge) or **v2 “I’m not a robot”** (for the checkbox).
   - **Domains:** add your production domain and, for local testing, `localhost`
3. Save. You’ll get a **Site key** and a **Secret key**.

## 2. Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` **or** `RECAPTCHA_SITE_KEY` | Vercel + `.env.local` | Site key |
| `RECAPTCHA_SECRET_KEY` | Vercel + `.env.local` (server only) | Secret key |
| `NEXT_PUBLIC_RECAPTCHA_VERSION` **or** `RECAPTCHA_VERSION` | Optional | `v3` for corner badge; default is `v2` |
| `RECAPTCHA_MIN_SCORE` | Optional (server) | v3 only; minimum score `0`–`1` (default **0.5**) |

- If only the secret is set, the API will require a CAPTCHA token but the client will not load a widget—set a site key too.
- Paste keys in Vercel without extra spaces or quotes; the app trims the secret on the server.

### Example: v3 (floating badge)

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_v3_site_key
RECAPTCHA_SECRET_KEY=your_v3_secret_key
NEXT_PUBLIC_RECAPTCHA_VERSION=v3
```

### Example: v2 (checkbox)

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_v2_site_key
RECAPTCHA_SECRET_KEY=your_v2_secret_key
```

## 3. Vercel

1. **Project → Settings → Environment Variables**
2. Add the variables above for your chosen type (v3 or v2).
3. **Redeploy**. The login page reads config from `GET /api/recaptcha-site-key` (`siteKey` + `version`).

## 4. Local

Copy the same vars into `.env.local` and restart the dev server.

## 5. Troubleshooting

- **v3 badge missing:** Confirm type is **v3** in Google Admin, `NEXT_PUBLIC_RECAPTCHA_VERSION=v3`, and `GET /api/recaptcha-site-key` returns `"version":"v3"` and a non-empty `siteKey`.
- **v2 checkbox missing:** Use v2 keys and do **not** set version to `v3` (or set `v2`).
- **Verification errors:** Site key + secret must be from the **same** reCAPTCHA registration and domain must include your hostname.
- Check the browser console for CSP or script errors; the app allows Google’s reCAPTCHA hosts.
