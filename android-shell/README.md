# CMF Agency Android shell (Play Store wrapper)

Wraps the **live** website. Does not reimplement Employee, Visitor Management, ticketing, or voting. Does not contain Paystack, Daraja, Supabase service, or HR API keys.

**Do not commit** until this has been technically reviewed. Do not ship to Play until `assetlinks.json` has a real release-keystore SHA-256.

## What it opens

Launch → Chrome Trusted Web Activity (falls back to Custom Tabs, then a locked WebView) → `https://cmfagency.co.ke/app`

The hub only links to:

- Smart Visitor Management sign-in
- Employees (`/app/employees` — roster, attendance, leave, QR; same live APIs)
- Ticketing (`/kcm/cfm-tickets`, then live campaign `/[slug]` and `/pay/[slug]`)
- Voting (`/voting/all`)

Payments stay on the existing Paystack / M-Pesa webhooks.

## Review checklist

- [ ] No secrets in this folder (grep for `sk_`, `PAYSTACK`, `MPESA`, `SERVICE_ROLE`, `fx_int_live_`)
- [ ] `UrlPolicy` matches `lib/android-shell.ts`
- [ ] `/app` hub is chrome-free and `noindex`
- [ ] Smoke-test on a phone browser first: SVM sign-in, employee scan, ticket pay, vote pay
- [ ] After review, set `ANDROID_TWA_SHA256_CERT_FINGERPRINTS` on Vercel (colon-separated SHA-256 from the **upload** keystore)
- [ ] Confirm `https://cmfagency.co.ke/.well-known/assetlinks.json` before a production Play release
- [ ] Play listing: this app is a wrapper for the existing site; payment is processed on the website

## Open in Android Studio

This machine does not require Java in the Next.js app. Use Android Studio (bundled JDK 17):

1. File → Open → `android-shell/`
2. Let Gradle sync
3. Run on a device with Chrome
4. Package is `ke.co.cmfagency.shell`. Digital Asset Links will not verify until the release SHA is published; Chrome will show a URL bar until then.

Fingerprint after you have a keystore:

```text
keytool -list -v -keystore <upload.keystore>
```

Put the SHA-256 in Vercel as `ANDROID_TWA_SHA256_CERT_FINGERPRINTS`. Optional: `ANDROID_TWA_PACKAGE_NAME=ke.co.cmfagency.shell`.

Until that env is set, `assetlinks.json` returns `[]` and Chrome shows a URL bar. That is intentional for review.
