# Fix Email Verification Issues

You have two issues to fix:
1. **Not receiving verification codes via email**
2. **Supabase still showing email as unverified**

## Issue 1: Not Receiving Emails

### Step 1: Check Vercel Function Logs

1. Go to your Vercel project → **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Click on `api/send-verification-email`
5. Open the **Logs** tab
6. Try registering a new account
7. Look for these messages:

**✅ Success:**
```
Email sent successfully via Resend to: [email]
```

**❌ Error - Missing API Key:**
```
RESEND_API_KEY not configured. Email cannot be sent.
```
**Solution:** Add `RESEND_API_KEY` to Vercel environment variables

**❌ Error - API Error:**
```
Resend API error: [error message]
```
**Solution:** Check the error message and fix accordingly

### Step 2: Check Resend Dashboard

1. Go to https://resend.com/emails
2. Check if emails appear in the list
3. Check the status:
   - **Delivered** ✅ - Email was sent successfully
   - **Bounced** ❌ - Email address is invalid
   - **Failed** ❌ - Check error message

### Step 3: Verify Environment Variables in Vercel

Go to Vercel → **Settings** → **Environment Variables** and verify:

- ✅ `RESEND_API_KEY` exists and starts with `re_`
- ✅ `RESEND_FROM_EMAIL` is set to `CMF Agency <onboarding@resend.dev>`

If missing, add them and **redeploy**.

### Step 4: Check Spam Folder

- Check your spam/junk folder
- Add `onboarding@resend.dev` to your contacts
- Try a different email address (Gmail, Outlook, etc.)

## Issue 2: Supabase Email Not Verified

### Step 1: Get Supabase Service Role Key

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Find **service_role** key (it's the **secret** key, not the anon key)
5. **⚠️ WARNING:** This key has admin access - keep it secret!

### Step 2: Add to Vercel

1. Go to Vercel → **Settings** → **Environment Variables**
2. Click **Add New**
3. Name: `SUPABASE_SERVICE_ROLE_KEY`
4. Value: Paste your service_role key
5. Select all environments (Production, Preview, Development)
6. Click **Save**

### Step 3: Redeploy

1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**

## Quick Test

After adding the service role key:

1. Register a new account
2. Enter the verification code
3. Check Supabase dashboard → **Authentication** → **Users**
4. The user's email should now show as **Confirmed** ✅

## Still Not Working?

### For Email Not Received:

1. **Check Vercel logs** - What error do you see?
2. **Check Resend dashboard** - Are emails being sent?
3. **Test with a different email** - Gmail, Outlook, etc.
4. **Check browser console** - Open F12 → Console tab, look for errors

### For Supabase Not Verified:

1. **Verify service role key** - Make sure it's the correct key from Supabase
2. **Check Vercel logs** - Look for errors in `api/confirm-email` function
3. **Check Supabase logs** - Go to Supabase → **Logs** → **API Logs**

## Current Environment Variables Needed

Add these to Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://jgroawmmjuhdjtdvnlxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4iZ3_t7mI9AEyjI98VhAPw_oFQxa02Q
SUPABASE_SERVICE_ROLE_KEY=[get from Supabase Settings → API]
RESEND_API_KEY=re_9HNjZdEJ_7mmPB3Ei2Nz9rAUGASA668AK
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

## Need Help?

Share:
1. What you see in Vercel function logs
2. What appears in Resend dashboard
3. Any error messages


