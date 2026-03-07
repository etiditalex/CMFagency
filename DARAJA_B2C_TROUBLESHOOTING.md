# M-Pesa B2C Withdrawal Troubleshooting

If you approved a withdrawal but **no money was received** and **balance didn't change correctly**, use this guide.

## Quick Checks

### 1. Did you see an error when clicking Approve?

- **Yes, error like "B2C credentials missing" or "OAuth failed"** → Fix env vars (see below).
- **Yes, "approved_but_b2c_failed"** → B2C API rejected the request. Check Vercel logs for the exact error.
- **No error** → B2C accepted the request. Money should be sent by Safaricom. If not received, check #2–#5.

### 2. Sandbox vs Production

| Environment | Real money? | What to use |
|-------------|------------|-------------|
| **Sandbox** | No. Simulated only. | Sandbox credentials, `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`, no `MPESA_B2C_URL` (or sandbox B2C URL) |
| **Production** | Yes. | Production credentials, `MPESA_B2C_URL` = your Proxy:B2C URL from Safaricom |

**Sandbox B2C does NOT send real money.** You need production B2C for real payouts.

### 3. Required Env Variables (Vercel)

Ensure these are set in **Vercel → Project → Settings → Environment Variables**:

| Variable | Used for | Notes |
|----------|----------|-------|
| `MPESA_B2C_INITIATOR_NAME` | B2C API | API operator username from [M-Pesa Org Portal](https://org.ke.m-pesa.com/) |
| `MPESA_B2C_SECURITY_CREDENTIAL` | B2C API | Initiator password **encrypted** with Safaricom certificate |
| `MPESA_B2C_SHORTCODE` or `MPESA_SHORTCODE` | B2C API | Your B2C-enabled shortcode |
| `MPESA_B2C_URL` | Production only | Paste the **Proxy:B2C** URL from Safaricom |
| `MPESA_CONSUMER_KEY` | OAuth + B2C | From your **B2C app** in Safaricom Developer Portal |
| `MPESA_CONSUMER_SECRET` | OAuth + B2C | From your **B2C app** |
| `NEXT_PUBLIC_SITE_URL` | Callback URL | Must be your live domain, e.g. `https://cmfagency.co.ke` |

**Important:** B2C and Lipa Na M-Pesa (STK Push) often use **different apps**. Production B2C needs consumer key/secret from the B2C app, not the STK app.

### 4. Security Credential (Encrypted Password)

The `MPESA_B2C_SECURITY_CREDENTIAL` is **not** the plaintext password. It must be encrypted:

1. Get the certificate: [Sandbox](https://developer.safaricom.co.ke/sites/default/files/cert/cert_sandbox/cert.cer) or [Production](https://developer.safaricom.co.ke/sites/default/files/cert/cert_prod/cert.cer)
2. Encrypt the initiator password with that certificate (RSA)
3. Put the base64-encoded result in `MPESA_B2C_SECURITY_CREDENTIAL`

Tools like [Daraja playground](https://developer.safaricom.co.ke/test_credentials) can encrypt for you in sandbox.

### 5. Callback URL

Safaricom POSTs the B2C result to:

```
<NEXT_PUBLIC_SITE_URL>/api/daraja/b2c-callback
```

- Must be **HTTPS** and **publicly reachable**
- `localhost` will **not** work—Safaricom cannot call it
- Ensure `NEXT_PUBLIC_SITE_URL` is your production domain

If the callback never reaches you, the withdrawal stays "processing" and balance stays deducted. Use **Revert** on the Payouts page to restore balance.

### 6. Organization M-Pesa Account

B2C **debits from your organization's M-Pesa account** (the shortcode). Ensure:

- The paybill/till has sufficient balance
- The account is active and B2C-enabled

### 7. Recipient Phone Number

- Format: `254712345678` (no + or spaces)
- Must be an M-Pesa-registered number

---

## Restoring Balance When Things Go Wrong

1. Go to **Dashboard → Payouts**
2. If a withdrawal shows **processing** or **approved** but no cash was received, it appears under **Stuck withdrawals**
3. Click **Revert** to mark it rejected and restore the balance

---

## Vercel Logs

Check **Vercel → Project → Deployments → [latest] → Functions** for:

- `/api/wallet/withdrawals/[id]/approve` – B2C initiation errors
- `/api/daraja/b2c-callback` – Whether Safaricom is calling your callback

If the callback is never logged, Safaricom cannot reach your URL. Fix `NEXT_PUBLIC_SITE_URL` or network/firewall issues.
