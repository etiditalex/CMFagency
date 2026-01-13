# Google OAuth Configuration Steps

## ✅ Environment Variables Setup

Your `.env.local` file has been created with your Supabase credentials.

## 🔧 Configure Google OAuth in Supabase Dashboard

Follow these steps to enable Google authentication:

### Step 1: Go to Supabase Dashboard

1. Visit: https://app.supabase.com
2. Select your project (jgroawmmjuhdjtdvnlxa)
3. Navigate to **Authentication** → **Providers**

### Step 2: Enable Google Provider

1. Find **Google** in the providers list
2. Click the **Enable** toggle to turn it on

### Step 3: Enter Google OAuth Credentials

Enter the following credentials:

**Client ID (for OAuth):**
```
[Your Google OAuth Client ID - Get from Google Cloud Console]
```

**Client Secret (for OAuth):**
```
[Your Google OAuth Client Secret - Get from Google Cloud Console]
```

### Step 4: Save Configuration

1. Click **Save** at the bottom of the page
2. Wait for the confirmation message

### Step 5: Verify Callback URL in Google Cloud Console

Make sure your Google Cloud Console has the correct redirect URI:

1. Go to: https://console.cloud.google.com
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID
4. Click **Edit**
5. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://jgroawmmjuhdjtdvnlxa.supabase.co/auth/v1/callback
   ```
6. If it's not there, add it and click **Save**

## ✅ Test Google OAuth

After configuration:

1. **Restart your development server** (if running):
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Test using the test page**:
   - Go to: http://localhost:3000/test-oauth
   - Click "Test Google Sign-In"
   - You should be redirected to Google's sign-in page

3. **Or test from login page**:
   - Go to: http://localhost:3000/login
   - Click "Continue with Google"
   - Complete the Google sign-in flow
   - You should be redirected to `/track-application` after successful login

## 🔍 Troubleshooting

### "Redirect URI mismatch" error
- **Solution**: Verify the redirect URI in Google Cloud Console matches exactly:
  - `https://jgroawmmjuhdjtdvnlxa.supabase.co/auth/v1/callback`
- Make sure there are no trailing slashes or extra characters

### "Invalid client" error
- **Solution**: 
  - Double-check Client ID and Client Secret in Supabase
  - Make sure Google provider is enabled in Supabase
  - Verify credentials are copied correctly (no extra spaces)

### OAuth not redirecting
- **Solution**:
  - Check browser console for errors
  - Verify Supabase project URL is correct
  - Make sure you restarted the dev server after updating `.env.local`

## 📝 Summary

✅ **Environment Variables**: Configured in `.env.local`
✅ **Supabase URL**: https://jgroawmmjuhdjtdvnlxa.supabase.co
✅ **Callback URL**: https://jgroawmmjuhdjtdvnlxa.supabase.co/auth/v1/callback
⏳ **Next Step**: Add Google OAuth credentials in Supabase Dashboard (see Step 3 above)

## 🚀 After Configuration

Once Google OAuth is configured in Supabase:
- Users can sign in with Google
- New accounts will be created automatically
- Users will be redirected to `/track-application` after login
- Email verification is not required for Google OAuth users
