# Production Google OAuth Setup Guide

This guide will help you configure Google OAuth to work on your live website.

## 📋 Prerequisites

You already have:
- ✅ Google OAuth Client ID: `[Your Client ID from Google Cloud Console]`
- ✅ Google OAuth Client Secret: `[Your Client Secret from Google Cloud Console]`
- ✅ Supabase Project: `YOUR_PROJECT_REF` (Dashboard → Settings → General)

## 🚀 Step-by-Step Setup

### Step 1: Configure Site URL in Supabase (CRITICAL - Fixes Localhost Redirect)

**This is the most important step to fix the localhost redirect issue!**

1. Go to: https://app.supabase.com
2. Select your Supabase project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Site URL**, change from `http://localhost:3000` to your production URL:
   ```
   https://cm-fagency.vercel.app
   ```
   (Or your custom domain if you have one, e.g., `https://cmfagency.co.ke`)
5. Under **Redirect URLs**, add your production domain:
   ```
   https://cm-fagency.vercel.app/**
   ```
   (The `**` allows all paths on your domain)
6. Click **Save**

### Step 2: Configure Google OAuth in Supabase Dashboard

1. Still in Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. Click **Enable** toggle to turn it on
5. Enter the credentials:
   - **Client ID (for OAuth)**: paste from Google Cloud Console → Credentials
   - **Client Secret (for OAuth)**: paste from the same OAuth client (never commit this value)
6. Click **Save**

### Step 3: Update Google Cloud Console Redirect URIs

1. Go to: https://console.cloud.google.com
2. Navigate to **APIs & Services** → **Credentials**
3. Open your OAuth 2.0 Client ID (the one used for Supabase Google sign-in)
4. Click **Edit** (pencil icon)
5. Under **Authorized redirect URIs**, add these URLs:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   https://cm-fagency.vercel.app/auth/callback
   https://cmfagency.co.ke/auth/callback
   ```
   (Add your actual production domain if different)
6. Click **Save**

### Step 4: Add Environment Variables to Vercel

1. Go to: https://vercel.com
2. Select your project: **CMFagency**
3. Go to **Settings** → **Environment Variables**
4. Add/Verify these variables are set for **Production**, **Preview**, and **Development**:

   **Required Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
   ```

5. For each variable:
   - Click **Add New** (or **Edit** if exists)
   - Enter the **Name**
   - Enter the **Value**
   - Select **Production**, **Preview**, and **Development**
   - Click **Save**

### Step 5: Redeploy Your Application

After adding/updating environment variables:

1. Go to **Deployments** tab in Vercel
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

Or simply push a new commit:
```bash
git commit --allow-empty -m "Trigger redeploy for OAuth"
git push origin main
```

## ✅ Verification Checklist

After setup, verify:

- [ ] **Site URL is set to production domain in Supabase** (CRITICAL!)
- [ ] **Redirect URLs include production domain in Supabase**
- [ ] Google OAuth is enabled in Supabase Dashboard
- [ ] Client ID and Secret are saved in Supabase
- [ ] Redirect URI is added in Google Cloud Console
- [ ] All environment variables are set in Vercel
- [ ] Application has been redeployed
- [ ] Test Google sign-in on production site

## 🧪 Testing on Production

1. Go to your live website: `https://cm-fagency.vercel.app` (or your domain)
2. Navigate to `/login` page
3. Click **"Continue with Google"**
4. You should be redirected to Google's sign-in page
5. After signing in, you should be redirected back to `/track-application`

## 🔍 Troubleshooting

### "Redirect URI mismatch" error

**Problem**: Google OAuth redirect URI doesn't match

**Solution**:
1. Check Google Cloud Console → Credentials → OAuth 2.0 Client ID
2. Verify the redirect URI is exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Make sure there are no trailing slashes
4. If using a custom domain, add that redirect URI too

### "Invalid client" error

**Problem**: Client ID or Secret is incorrect

**Solution**:
1. Double-check credentials in Supabase Dashboard
2. Make sure Google provider is enabled
3. Verify no extra spaces when copying credentials

### OAuth redirecting to localhost on production

**Problem**: Supabase Site URL is still set to localhost

**Solution**:
1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Change **Site URL** from `http://localhost:3000` to your production URL
3. Add production domain to **Redirect URLs** with `/**` wildcard
4. Save and test again

### OAuth not working on production but works locally

**Problem**: Environment variables not set in Vercel OR Site URL not configured

**Solution**:
1. Verify all environment variables are in Vercel
2. Make sure they're set for **Production** environment
3. **Check Supabase Site URL is set to production domain** (most common issue!)
4. Redeploy the application after adding variables

### User redirected to wrong page after login

**Problem**: Redirect URL in code doesn't match production domain

**Solution**:
- The code already uses `window.location.origin` which automatically adapts to your domain
- If issues persist, check `contexts/AuthContext.tsx` line 344

## 📝 Important Notes

1. **Site URL in Supabase MUST be set to production domain** - This is the #1 cause of localhost redirects!
2. **Google OAuth credentials are stored in Supabase**, not in Vercel environment variables
3. **Supabase environment variables** (URL and keys) are stored in Vercel
4. **The redirect URI** must match exactly in Google Cloud Console
5. **Production domain** should be added to Google Cloud Console redirect URIs if using a custom domain
6. **You don't need to add anything to Vercel for Google OAuth** - only Supabase environment variables (URL and keys)

## 🎯 Quick Reference

| Item | Value | Location |
|------|-------|----------|
| **Client ID** | `[Your Google OAuth Client ID]` | Supabase Dashboard → Auth → Providers → Google |
| **Client Secret** | `[Your Google OAuth Client Secret]` | Supabase Dashboard → Auth → Providers → Google |
| **Redirect URI** | `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` | Google Cloud Console → Credentials |
| **Supabase URL** | From Supabase → Settings → API | Vercel Environment Variables |
| **Supabase Anon Key** | publishable/anon key from same page | Vercel Environment Variables |
| **Service Role Key** | service_role secret (server only; never in client or docs) | Vercel Environment Variables |

## 🚀 After Setup

Once configured:
- ✅ Users can sign in with Google on production
- ✅ New accounts created automatically
- ✅ Users redirected to `/track-application` after login
- ✅ Works on both localhost and production domains
