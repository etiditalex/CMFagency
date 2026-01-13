# Quick Fix: Google OAuth Redirecting to Localhost

## The Problem
When clicking "Sign in with Google" on production, it redirects to `localhost:3000` instead of your production domain.

## The Solution (2 Minutes)

**You need to update the Site URL in Supabase - this is the #1 cause of this issue!**

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select project: **jgroawmmjuhdjtdvnlxa**

2. **Update Site URL**
   - Navigate to: **Authentication** → **URL Configuration**
   - Find **Site URL** field
   - Change from: `http://localhost:3000`
   - Change to: `https://cm-fagency.vercel.app`
     (Or your custom domain if you have one)

3. **Add Redirect URLs**
   - Scroll to **Redirect URLs** section
   - Add: `https://cm-fagency.vercel.app/**`
   - The `**` allows all paths on your domain
   - Click **Save**

4. **Test**
   - Go to your production site: `https://cm-fagency.vercel.app/login`
   - Click "Continue with Google"
   - Should now redirect to Google (not localhost)
   - After sign-in, should redirect back to production domain

## That's It!

**You don't need to add anything to Vercel for Google OAuth.** The OAuth credentials are stored in Supabase, and Vercel only needs the Supabase environment variables (which you already have).

## Why This Happens

Supabase uses the **Site URL** setting to determine where to redirect users after OAuth. If it's set to `localhost:3000`, it will always redirect there, even on production.

## Still Not Working?

1. Clear your browser cache
2. Try in an incognito/private window
3. Check that the Site URL in Supabase exactly matches your production domain
4. Verify Google Cloud Console has the correct redirect URI: `https://jgroawmmjuhdjtdvnlxa.supabase.co/auth/v1/callback`
