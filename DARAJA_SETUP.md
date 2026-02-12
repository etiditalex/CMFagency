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

---

## Fusion Xpress Dashboard – CFMA ticket sales

Ticket purchases from the upcoming events page ("Buy Ticket Online") **automatically appear in the Fusion Xpress dashboard**. The flow:

1. **Campaign setup**: Ensure CFMA campaigns exist. Run in Supabase SQL editor:
   ```
   database/ticketing_voting_mvp_seed_cfma_campaigns.sql
   ```
   This creates `cfma-2026` (Regular KES 500), `cfma-2026-vip` (VIP KES 1500), and `cfma-2026-vvip` (VVIP KES 3500) campaigns, owned by your first admin.

2. **Real-time updates**: The dashboard subscribes to `transactions` and `ticket_issues`. After a successful M-Pesa payment:
   - The transaction is updated to `status = 'success'`
   - Ticket issues are recorded
   - The dashboard refreshes via Supabase Realtime (or 15s polling)

3. **Supabase Realtime** (optional for instant updates): In Supabase Dashboard → Database → Replication, add `transactions` and `ticket_issues` to the replication set. Otherwise, the dashboard still updates within ~15 seconds via polling.

4. **Where to view sales**: Log in to Fusion Xpress → Dashboard → Campaigns. Click **CFMA 2026 - Early Bird Regular**, **Early Bird VIP**, or **Early Bird VVIP** to see transactions, revenue, and ticket counts. Portal members can also use the "View ticket sales in Fusion Xpress" link on the upcoming events page.

