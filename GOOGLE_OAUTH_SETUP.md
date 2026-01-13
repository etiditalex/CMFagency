# Google OAuth Setup Guide

## Overview

The login page now supports Google authentication. Users can sign in or create an account using their Google credentials.

## Setup Steps

### 1. Enable Google Provider in Supabase

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. Click **Enable** toggle
5. You'll need to configure Google OAuth credentials

### 2. Create Google OAuth Credentials

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen (if not done):
   - User Type: **External** (for public use)
   - App name: **CMF Agency** or **Changer Fusions**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **CMF Agency Web**
   - Authorized redirect URIs: Add these:
     - `https://jgroawmmjuhdjtdvnlxa.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for local development)
   - Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 3. Configure Supabase with Google Credentials

1. Back in Supabase → **Authentication** → **Providers** → **Google**
2. Enter:
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
3. Click **Save**

### 4. Update Redirect URLs (if needed)

The redirect URL is automatically set to `/track-application` in the code. If you need to change it:

- Edit `contexts/AuthContext.tsx`
- Find `signInWithGoogle` function
- Update `redirectTo: `${window.location.origin}/track-application``

### 5. Test Google Sign-In

**Option 1: Use the Test Page**
1. Go to `/test-oauth` page
2. Click **Test Google Sign-In** button
3. Check the configuration status
4. Review any error messages

**Option 2: Use the Login Page**
1. Go to your login page: `/login`
2. Click **Sign in with Google**
3. You should be redirected to Google's sign-in page
4. After signing in, you'll be redirected back to `/track-application`

## How It Works

1. User clicks "Sign in with Google"
2. User is redirected to Google's OAuth page
3. User authorizes the application
4. Google redirects back to Supabase with an authorization code
5. Supabase exchanges the code for user information
6. User is automatically logged in and redirected to `/track-application`

## For Production (Vercel)

When deploying to Vercel:

1. Update the authorized redirect URI in Google Cloud Console:
   - Add: `https://[your-supabase-project].supabase.co/auth/v1/callback`
   - Remove localhost URLs (or keep for development)

2. The redirect URL in code (`/track-application`) will work automatically on your production domain

## Troubleshooting

### "Redirect URI mismatch" error
- Check that the redirect URI in Google Cloud Console matches exactly:
  - `https://[your-supabase-project].supabase.co/auth/v1/callback`

### "Invalid client" error
- Verify Client ID and Client Secret are correct in Supabase
- Make sure Google provider is enabled in Supabase

### User not redirected after Google sign-in
- Check browser console for errors
- Verify redirect URL is set correctly in `signInWithGoogle` function
- Check Supabase logs for authentication errors

## Notes

- Google OAuth works for both **signing in** and **creating new accounts**
- If a user signs in with Google and doesn't have an account, one will be created automatically
- User's name and email from Google will be used for the account
- Email verification is not required for Google OAuth users (Google already verifies emails)
