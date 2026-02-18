# M-Pesa Daraja API Setup (Fusion Xpress)

This guide explains how to enable **M-Pesa STK Push** (native Kenya payments) via Safaricom's Daraja API in your Fusion Xpress system.

## Database Status (Supabase)

**No new migrations are required.** The existing schema already supports Daraja:

- `transactions.provider` accepts `'daraja'` (in addition to `'paystack'`)
- `transactions.metadata` (jsonb) stores `checkout_request_id`, `mpesa_receipt`, `phone`, etc.
- `transactions.payer_name` is used for receipts (ensure patch 15 is applied)
- The callback uses `ticket_issues` and `votes` tables—same as Paystack

If you've applied the ticketing MVP patches (`ticketing_voting_mvp.sql` + patch 15), the database is ready.

## Activation Checklist

M-Pesa will only appear and work when all of the following are set in **Vercel** → Project → Settings → Environment Variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_MPESA_ENABLED` | Optional | No longer required—M-Pesa option always shows for KES campaigns |
| `MPESA_CONSUMER_KEY` | **Yes** | From Safaricom Developer Portal |
| `MPESA_CONSUMER_SECRET` | **Yes** | From Safaricom Developer Portal |
| `MPESA_SHORTCODE` | **Yes** | Your Business Short Code |
| `MPESA_PASSKEY` | **Yes** | Lipa Na M-Pesa Online Passkey |
| `NEXT_PUBLIC_SITE_URL` | **Yes** | e.g. `https://cmfagency.co.ke` (for callback) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | For callback to update transactions |

**Production only:** Add `MPESA_OAUTH_URL` and `MPESA_STKPUSH_URL` if Safaricom gave you proxy URLs.

After adding/env variables, **redeploy** the project in Vercel so the changes take effect.

### "Failed to get Daraja OAuth token" troubleshooting

| Cause | Fix |
|-------|-----|
| **Wrong credentials** | Verify `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` from [Safaricom Developer Portal](https://developer.safaricom.co.ke/) → Your App → Keys. No spaces or quotes. |
| **Sandbox vs Production** | Sandbox: `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`, use sandbox keys. Production: use production keys + `MPESA_BASE_URL=https://api.safaricom.co.ke` or custom proxy URLs. |
| **Production proxy URLs** | If using proxy: set `MPESA_OAUTH_URL` to the **full** URL including `?grant_type=client_credentials` (or we append it). If still failing, try **removing** MPESA_OAUTH_URL and use only `MPESA_BASE_URL=https://api.safaricom.co.ke` with production keys. |
| **App not approved** | Production apps must be approved. Use sandbox for testing. |
| **Typos in env vars** | Check for extra spaces, missing characters. Keys are long—copy‑paste from the portal. |
| **HTTP 404** | OAuth URL wrong. Remove `MPESA_OAUTH_URL` and use `MPESA_BASE_URL=https://api.safaricom.co.ke`, or fix the proxy URL. |
| **HTTP 401** | Consumer key or secret is wrong. Re-copy from Safaricom portal. |

## Overview

- **STK Push** = A payment prompt is sent directly to the customer's phone. They enter their M-Pesa PIN to complete payment—no manual paybill entry.
- **Daraja API** = Safaricom's official API for M-Pesa integration.
- **Flow**: User selects M-Pesa → enters phone number → STK push initiated → user gets prompt on phone → Safaricom calls your callback → tickets issued, receipt sent.

## Environment Variables

Add these in **Vercel** → Project → Settings → Environment Variables (or your hosting provider):

### Required (Daraja)
| Variable | Description |
|----------|-------------|
| `MPESA_CONSUMER_KEY` | From [Safaricom Developer Portal](https://developer.safaricom.co.ke/) → Your App → Consumer Key |
| `MPESA_CONSUMER_SECRET` | Same app → Consumer Secret |
| `MPESA_SHORTCODE` | Your Business Short Code (Till or Paybill), e.g. `174379` for sandbox |
| `MPESA_PASSKEY` | Lipa Na M-Pesa Online Passkey from the portal |

### Required (general)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Your public site URL, e.g. `https://cmfagency.co.ke` (used for callback) |
| `NEXT_PUBLIC_MPESA_ENABLED` | Set to `true` to show M-Pesa option in the UI |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for callback & metadata updates) |

### Optional (production proxy URLs)
When going live, Safaricom may provide **custom proxy URLs** for your app (e.g. Proxy:OAuth2Token, Proxy:STKPush, Proxy:STKPushQuery). Add the **full URLs** you received:

| Variable | Description |
|----------|-------------|
| `MPESA_OAUTH_URL` | Full URL for OAuth token (e.g. the Proxy:OAuth2Token link from Safaricom) |
| `MPESA_STKPUSH_URL` | Full URL for STK Push (Proxy:STKPush link) |
| `MPESA_STKPUSH_QUERY_URL` | Full URL for STK Push Query (Proxy:STKPushQuery) – reserved for future use |

If these are set, they override `MPESA_BASE_URL` for those calls. If not set, the app uses standard paths under `MPESA_BASE_URL`.

### Optional (other)
| Variable | Description |
|----------|-------------|
| `MPESA_BASE_URL` | **Sandbox**: `https://sandbox.safaricom.co.ke` (default) / **Production**: `https://api.safaricom.co.ke` |
| `RESEND_API_KEY` | For sending receipt emails |
| `RESEND_FROM_EMAIL` | From address for receipts |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/daraja/stk-push` | POST | Initiates STK Push—creates pending transaction, sends prompt to user's phone |
| `/api/daraja/callback` | POST | Called by Safaricom when user completes/cancels. Updates transaction, issues tickets, sends receipt |

## Callback URL

Safaricom must be able to reach your callback URL. It is set automatically to:

```
<NEXT_PUBLIC_SITE_URL>/api/daraja/callback
```

**Important:**
- Use **HTTPS** in production (Safaricom requires it).
- `localhost` will **not** receive callbacks—use a tunnel (e.g. ngrok) for local testing.
- Configure your Daraja app in the portal to allow callbacks to your domain.

## Campaign Requirements

- M-Pesa is only available for campaigns with currency **KES**.
- Phone numbers must be in format `254XXXXXXXXX` (e.g. `254712345678`).

## Where M-Pesa Appears

1. **Campaign payment page** (`/[slug]`) – When `NEXT_PUBLIC_MPESA_ENABLED=true` and campaign is KES, users see "M-Pesa (Kenya)" and "Card / Airtel" options.
2. **CFMA Ticket Modal** – "Buy Ticket Online" on upcoming events; M-Pesa option in step 2 when enabled.

## Sandbox vs Production

- **Sandbox**: Use sandbox credentials and `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`. Test numbers: [Safaricom sandbox docs](https://developer.safaricom.co.ke/).
- **Production**: Switch to production credentials, `MPESA_BASE_URL=https://api.safaricom.co.ke`, and ensure your app is approved for production.

## Paystack vs Daraja

- **Paystack**: Card, M-Pesa, Airtel (via Paystack gateway). Use for campaigns where Paystack is configured.
- **Daraja**: Native M-Pesa STK Push (direct Safaricom). Often preferred for local Kenyan payments, lower fees, no intermediary.
- Both can coexist: KES campaigns show M-Pesa (Daraja) and Card/Airtel (Paystack). Non-KES campaigns use Paystack only.
