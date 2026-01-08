# Resend Domain Verification - Required for Production

## The Problem
Resend **does not allow** sending emails FROM Gmail addresses. You must verify a custom domain to send emails to any recipient.

## Current Limitation
- **Using `onboarding@resend.dev`**: Can only send to your verified email (changerfusions@gmail.com)
- **Using `changerfusions@gmail.com`**: ❌ Not allowed - Gmail domain cannot be verified

## Solution: Verify Your Domain

### Option 1: Verify Your Domain in Resend (Recommended for Production)

1. **Go to Resend Domains:**
   - Visit https://resend.com/domains
   - Click "Add Domain"

2. **Add Your Domain:**
   - Enter your domain (e.g., `cmfagency.co.ke`)
   - Click "Add"

3. **Add DNS Records:**
   Resend will show you DNS records to add:
   - **SPF Record** (TXT)
   - **DKIM Record** (TXT)
   - **DMARC Record** (TXT) - Optional but recommended

4. **Add Records to Your Domain:**
   - Go to your domain registrar (where you bought the domain)
   - Access DNS settings
   - Add the records Resend provides
   - Wait for DNS propagation (5-60 minutes)

5. **Verify Domain:**
   - Go back to Resend dashboard
   - Click "Verify" next to your domain
   - Wait for verification (usually instant once DNS propagates)

6. **Update Configuration:**
   Once verified, update `.env.local`:
   ```env
   RESEND_FROM_EMAIL=CMF Agency <noreply@yourdomain.com>
   ```
   Or:
   ```env
   RESEND_FROM_EMAIL=CMF Agency <no-reply@yourdomain.com>
   ```

### Option 2: Use Alternative Email Service

If you don't have a domain, consider:
- **SendGrid** - Free tier: 100 emails/day
- **Mailgun** - Free tier: 5,000 emails/month
- **Amazon SES** - Very cheap, requires AWS account
- **Postmark** - Paid but reliable

### Option 3: Temporary Workaround (Testing Only)

For now, emails will only work when sending to `changerfusions@gmail.com`:
- Use `onboarding@resend.dev` as sender
- Only send verification codes to `changerfusions@gmail.com`
- This works for testing but not for production

## Current Configuration

I've reverted to `onboarding@resend.dev` which will:
- ✅ Work for sending to `changerfusions@gmail.com`
- ❌ Not work for other email addresses

## Next Steps

1. **For Testing Now:**
   - Use `changerfusions@gmail.com` as the recipient
   - Restart dev server
   - Test registration with that email

2. **For Production:**
   - Verify your domain in Resend
   - Update `RESEND_FROM_EMAIL` to use your domain
   - Deploy and test

## Quick Domain Verification Guide

If you have a domain (e.g., cmfagency.co.ke):

1. Go to https://resend.com/domains
2. Add domain
3. Copy DNS records
4. Add to your domain's DNS (at your registrar)
5. Wait 5-60 minutes
6. Click "Verify" in Resend
7. Update `.env.local` with your domain email

## Need Help?

If you need help with:
- Domain verification steps
- DNS record setup
- Alternative email services

Let me know and I can provide detailed instructions!

