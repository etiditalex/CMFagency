# Payment "Unable to create transaction" Troubleshooting

When you see **"Unable to create transaction (RLS rejected or invalid campaign)"**, the database insert into `transactions` is being blocked. Here are the common causes and how to fix them.

## 1. Run patch_10 (Remove VAT)

Patch 10 ensures the `amount` constraint is `amount = quantity * unit_amount` (no VAT).

**Fix:** Run `database/ticketing_voting_mvp_patch_10_remove_vat.sql` in the Supabase SQL Editor.

---

## 2. Campaign not active or outside date window

The RLS policy only allows transaction inserts when the campaign is:

- `is_active = true`
- `starts_at` is NULL or in the past
- `ends_at` is NULL or in the future

**Fix:** In Supabase → Table Editor → `campaigns`:

- Set `is_active` = `true`
- Set `starts_at` and `ends_at` to NULL, or adjust them to valid dates

---

## 3. Campaign doesn’t exist

The slug (e.g. `cfma-2026`, `cfma-2026-vip`) must exist in `campaigns`.

**Fix:** Run `database/ticketing_voting_mvp_seed_cfma_campaigns.sql` in the Supabase SQL Editor (requires at least one admin in `portal_members`).

---

## 4. Check the exact error

The API now returns `details` with the raw Supabase error. Use it to see whether the failure is due to:

- A check constraint (e.g. amount)
- RLS policy
- Missing column

---

## 5. Transactions stuck on "pending" (Paystack)

When Paystack payments succeed but the dashboard still shows **pending**, the webhook may not be reaching your server.

**Immediate fix:** Use the **"Sync pending"** button on the Fusion Xpress dashboard. It verifies each pending Paystack transaction against Paystack's API and updates status to success.

**Webhook setup (to prevent future stuck payments):**

1. Paystack Dashboard → Settings → API Keys & Webhooks
2. Set Webhook URL: `https://<your-supabase-project>.supabase.co/functions/v1/paystack-webhook`
3. Deploy the `paystack-webhook` Edge Function in Supabase and set secrets:
   - `PAYSTACK_SECRET_KEY` (must match your Paystack secret)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Common webhook causes:**
- Webhook URL not set or wrong (localhost cannot receive webhooks)
- Wrong `PAYSTACK_SECRET_KEY` in Supabase (signature verification fails)
- Amount mismatch: our `tx.amount` is whole units (e.g. 5 KES); Paystack sends subunits (500). The webhook expects `tx.amount * 100` to match.

---

## Quick checklist

1. Run `ticketing_voting_mvp_patch_10_remove_vat.sql`
2. Run `ticketing_voting_mvp_seed_cfma_campaigns.sql` (if CFMA campaigns are used)
3. In `campaigns`, ensure `is_active = true` and dates are valid (or NULL)
4. For stuck Paystack payments: click **Sync pending** on the dashboard
