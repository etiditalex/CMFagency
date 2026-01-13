# Fix OAuth Webpack Error - "Cannot find module './1682.js'"

## Problem

After deploying, clicking "Sign in with Google" shows:
- Error: `Cannot find module './1682.js'`
- References to local environment paths
- OAuth not working on production

## Root Cause

This is typically a **webpack chunk loading issue** caused by:
1. Stale build cache on Vercel
2. Mismatch between server and client chunks
3. Corrupted build artifacts

## Solutions

### Solution 1: Clear Vercel Build Cache (Recommended)

1. Go to: https://vercel.com
2. Select your project: **CMFagency**
3. Go to **Settings** → **General**
4. Scroll down to **Build & Development Settings**
5. Click **Clear Build Cache**
6. Go to **Deployments** tab
7. Click **⋯** on latest deployment → **Redeploy**

### Solution 2: Force Clean Build

1. In Vercel, go to **Settings** → **General**
2. Under **Build Command**, temporarily change to:
   ```
   rm -rf .next && npm run build
   ```
3. Save and redeploy
4. After successful deploy, change it back to:
   ```
   npm run build
   ```

### Solution 3: Verify Environment Variables

Make sure these are set in Vercel **Production** environment:

```
NEXT_PUBLIC_SUPABASE_URL=https://jgroawmmjuhdjtdvnlxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4iZ3_t7mI9AEyjI98VhAPw_oFQxa02Q
SUPABASE_SERVICE_ROLE_KEY=sb_secret_LInH07sUitnqEusE_FOzdQ_BlQV6AIL
```

### Solution 4: Check OAuth Redirect Configuration

1. **Supabase Dashboard**:
   - Go to: https://app.supabase.com
   - Project: **jgroawmmjuhdjtdvnlxa**
   - **Authentication** → **Providers** → **Google**
   - Verify it's enabled and credentials are saved

2. **Google Cloud Console**:
   - Go to: https://console.cloud.google.com
   - **APIs & Services** → **Credentials**
   - Find OAuth Client ID: `837082169242-5pu8of4utofhnapbkvp8kag5po2v3ghu`
   - **Authorized redirect URIs** must include:
     ```
     https://jgroawmmjuhdjtdvnlxa.supabase.co/auth/v1/callback
     ```

### Solution 5: Check Production Domain

If using a custom domain, make sure:
1. Domain is properly configured in Vercel
2. Google Cloud Console has the domain in redirect URIs
3. Supabase redirect URL uses the correct domain

## Quick Fix Steps

1. **Clear Vercel cache** (Solution 1)
2. **Redeploy** the application
3. **Test** Google sign-in on production
4. If still failing, check **Vercel build logs** for specific errors

## Verification

After applying fixes:
1. Go to your production site: `https://cm-fagency.vercel.app/login`
2. Click "Continue with Google"
3. Should redirect to Google sign-in (not localhost)
4. After sign-in, should redirect to `/track-application` on production domain

## Additional Notes

- The code uses `window.location.origin` which automatically uses the correct domain
- The error is a build/chunk issue, not a code issue
- Clearing the build cache usually resolves this
