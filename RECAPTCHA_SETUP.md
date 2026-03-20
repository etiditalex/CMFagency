# Google reCAPTCHA on Login

The login page can use **reCAPTCHA v3** (floating **Privacy – Terms** badge at the bottom-right, invisible challenge) or **v2** (“I’m not a robot” checkbox). Your **site key type in Google Admin must match** the mode you choose.

## v3 vs v2 (quick choice)

| | **v3** (badge in corner) | **v2** (checkbox) |
|---|--------------------------|-------------------|
| Google Admin type | **Score based** (v3) | **“I’m not a robot”** (v2) |
| Env | **Default** — no variable needed | Set `NEXT_PUBLIC_RECAPTCHA_VERSION=v2` (or `RECAPTCHA_VERSION=v2`) |
| UX | Badge + token when you tap **Resend code** on the code step | Checkbox on the code step before **Resend code** (Sign in needs no CAPTCHA) |

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
| `NEXT_PUBLIC_RECAPTCHA_VERSION` **or** `RECAPTCHA_VERSION` (and aliases — see below) | Optional | Default **v3** (badge). Set **`v2`** if your Google keys are checkbox (v2) only. |
| `RECAPTCHA_MIN_SCORE` | Optional (server) | v3 only; minimum score `0`–`1` (default **0.5**) |

- **First** login verification email (right after password) is sent **without** client CAPTCHA (same idea as Fusion Xpress). If the secret is set, **Resend code** requires a valid CAPTCHA. If only the secret is set (no site key), resend will fail until you add a site key.
- Paste keys in Vercel without extra spaces or quotes; the app trims the secret on the server.

### Example: v3 (floating badge) — usual setup

Use **Score-based (v3)** keys in Google Admin. Only site + secret are required:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_v3_site_key
RECAPTCHA_SECRET_KEY=your_v3_secret_key
```

Optional: `NEXT_PUBLIC_RECAPTCHA_VERSION=v3` or `score` or `true` (same as default).

**Aliases** (any one): `NEXT_PUBLIC_GOOGLE_RECAPTCHA_VERSION`, `GOOGLE_RECAPTCHA_VERSION`, `NEXT_PUBLIC_RECAPTCHA_V3`, `RECAPTCHA_V3` — values like `v3`, `3`, `score`, `true`, `1` all select v3.

### Example: v2 (checkbox)

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_v2_site_key
RECAPTCHA_SECRET_KEY=your_v2_secret_key
NEXT_PUBLIC_RECAPTCHA_VERSION=v2
```

## 3. Vercel

1. **Project → Settings → Environment Variables**
2. Add the variables above for your chosen type (v3 or v2).
3. **Redeploy**. The login page reads config from `GET /api/recaptcha-site-key` (`siteKey` + `version`).

## 4. Local

Copy the same vars into `.env.local` and restart the dev server.

## 5. Troubleshooting

- **v3 badge missing:** Confirm type is **Score-based (v3)** in Google Admin. Open `GET /api/recaptcha-site-key` on your site — expect `"version":"v3"` (default) and a non-empty `siteKey`. If you see `"version":"v2"`, remove or change any env that forces v2, or set `NEXT_PUBLIC_RECAPTCHA_VERSION=v3`.
- **v2 checkbox missing:** Use v2 keys and do **not** set version to `v3` (or set `v2`).
- **Verification errors:** Site key + secret must be from the **same** reCAPTCHA registration and domain must include your hostname.
- Check the browser console for CSP or script errors; the app allows Google’s reCAPTCHA hosts.
