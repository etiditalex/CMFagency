# Local Testing Guide - Email Verification

Test the email verification system locally before deploying.

## Step 1: Check Environment Variables

Make sure your `.env.local` file has all required variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://jgroawmmjuhdjtdvnlxa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4iZ3_t7mI9AEyjI98VhAPw_oFQxa02Q
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Resend Email Configuration
RESEND_API_KEY=re_9HNjZdEJ_7mmPB3Ei2Nz9rAUGASA668AK
RESEND_FROM_EMAIL=CMF Agency <onboarding@resend.dev>
```

**⚠️ Important:** You need to add `SUPABASE_SERVICE_ROLE_KEY` to your `.env.local` file.

**How to get it:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **service_role** key (the secret one, not the anon key)

## Step 2: Start Development Server

```bash
npm run dev
```

The server should start on http://localhost:3000

## Step 3: Test Registration Flow

### Test 1: Register a New Account

1. Go to http://localhost:3000/login
2. Click "Sign Up / Register"
3. Fill in:
   - Full Name: Test User
   - Email: Use a real email you can check
   - Password: At least 6 characters
4. Click "Create Account"

### What to Check:

**In Browser Console (F12 → Console tab):**
- Look for: `Verification email sent successfully to: [email]` ✅
- Or: `Failed to send verification email: [error]` ❌

**In Terminal (where npm run dev is running):**
- Look for: `Email sent successfully via Resend to: [email]` ✅
- Or: `Resend API error:` ❌

**Check Your Email:**
- You should receive an email with a 6-digit verification code
- Check spam folder if not in inbox

### Test 2: Verify Email Code

1. Go to http://localhost:3000/verify-email
2. Enter your email address
3. Enter the 6-digit code from your email
4. Click "Verify Email"

### What to Check:

**In Browser Console:**
- Look for: `Email confirmed successfully in Supabase` ✅

**In Terminal:**
- Look for: `Email confirmed successfully in Supabase for: [email]` ✅

**In Supabase Dashboard:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **Users**
4. Find your test user
5. Check if **Email Confirmed** shows as ✅ (green checkmark)

## Step 4: Test Resend Code

1. On the verify-email page
2. Click "Didn't receive the code? Resend"
3. Check your email for a new code

## Common Issues & Solutions

### Issue 1: "RESEND_API_KEY not configured"

**Solution:**
- Make sure `RESEND_API_KEY` is in `.env.local`
- Restart the dev server: Stop (Ctrl+C) and run `npm run dev` again

### Issue 2: "Missing Supabase service role key"

**Solution:**
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
- Get it from Supabase → Settings → API → service_role key
- Restart the dev server

### Issue 3: Email Not Received

**Check:**
1. Browser console for errors
2. Terminal for API errors
3. Spam/junk folder
4. Resend dashboard: https://resend.com/emails

### Issue 4: Supabase Still Shows Unverified

**Check:**
1. Terminal for: "Email confirmed successfully in Supabase"
2. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
3. Check Supabase dashboard after verification

## Step 5: Verify Everything Works

✅ **Registration** - User can register
✅ **Email Sent** - Verification code email received
✅ **Code Verification** - Code works on verify-email page
✅ **Supabase Confirmed** - Email shows as confirmed in Supabase dashboard
✅ **Redirect** - User redirected to /application after verification

## Ready to Deploy?

Once all tests pass locally:

1. ✅ All environment variables working
2. ✅ Emails being sent and received
3. ✅ Supabase showing emails as confirmed
4. ✅ Full flow working end-to-end

Then you can push to GitHub and deploy to Vercel!



