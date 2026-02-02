# M-Pesa Daraja (STK Push) Setup

This project now supports **M-Pesa Daraja STK Push** via:
- `POST /api/mpesa/initialize` (creates pending transaction + triggers STK prompt)
- `POST /api/mpesa/callback` (Safaricom callback; marks transaction success/failed + fulfills)
- `GET /api/transactions/status?ref=...` (UI polling)

## Environment variables (Vercel)

Add these in Vercel → Project → Settings → Environment Variables:

### Required
- `NEXT_PUBLIC_SITE_URL` (e.g. `https://cmfagency.co.ke`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Daraja (STK Push)
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE` (Business Short Code)
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_TOKEN` (random shared secret; used to validate callbacks)

### Optional
- `MPESA_BASE_URL`
  - **Sandbox (STK Push endpoint you shared)**: `https://sandbox.safaricom.co.ke`
  - **Production**: `https://api.safaricom.co.ke`
- `MPESA_TRANSACTION_TYPE`
  - Default: `CustomerPayBillOnline`

## Callback URL

This app sets the callback automatically to:

`<NEXT_PUBLIC_SITE_URL>/api/mpesa/callback?token=<MPESA_CALLBACK_TOKEN>`

Make sure your Daraja app is configured to allow callbacks to your domain (public HTTPS).

## Notes

- Campaign currency must be **KES** for M-Pesa payments.
- The `/pay/[slug]` page now uses **phone (M-Pesa)** instead of Paystack redirect checkout.

