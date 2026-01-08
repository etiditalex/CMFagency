# Vercel Deployment Guide - Email Verification

## Current Setup: Email Verification is Optional

✅ **Users can register and access the application immediately**
✅ **Email verification is optional** - can be done later
✅ **Works on Vercel without additional setup**

## How It Works

1. **User registers** → Account created → Auto-logged in
2. **User redirected to application** → Can start using immediately
3. **Email verification** → Optional, can be done later via `/verify-email`

## Environment Variables for Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

### Required:
```
NEXT_PUBLIC_SUPABASE_URL=https://jgroawmmjuhdjtdvnlxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4iZ3_t7mI9AEyjI98VhAPw_oFQxa02Q
SUPABASE_SERVICE_ROLE_KEY=[your service role key]
```

### Optional (for email sending):
```
RESEND_API_KEY=re_HVKoFRgK_KG7DEDtDbJ6HwyGa5FKEgHJ1
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

**Note:** Even if Resend is not configured, the app works! Email verification just won't send emails.

## Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Make email verification optional for production"
   git push
   ```

2. **Vercel will auto-deploy** (if connected to GitHub)

3. **Add Environment Variables in Vercel:**
   - Go to Vercel Dashboard
   - Your Project → Settings → Environment Variables
   - Add all variables listed above
   - Redeploy if needed

4. **Test Deployment:**
   - Visit your Vercel URL
   - Try registering a new account
   - Should work immediately!

## Future: Enable Full Email Verification

When you're ready to enable email verification:

### Option 1: Verify Domain in Resend (Recommended)
1. Go to https://resend.com/domains
2. Add and verify your domain
3. Update `RESEND_FROM_EMAIL` in Vercel to use your domain
4. Redeploy

### Option 2: Use Supabase SMTP
1. Configure Gmail SMTP in Supabase dashboard
2. Update email templates
3. No code changes needed

## Testing

After deployment:
1. ✅ Register new account → Should work
2. ✅ Access application → Should work
3. ✅ Email verification → Optional (works if Resend configured)

## Benefits of This Approach

✅ **Deploy immediately** - No blocking issues
✅ **Users can register** - No email dependency
✅ **Works on Vercel** - No special configuration needed
✅ **Add email later** - When domain is verified
✅ **No user frustration** - App works even if email fails

